// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @notice Minimal interface for Uniswap V3 SwapRouter
interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

/// @notice Minimal interface for WETH (wrapped native token)
interface IWETH {
    function withdraw(uint256) external;
}

contract GasStation is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    ISwapRouter public immutable swapRouter;
    IWETH public immutable weth;

    /// @notice Uniswap V3 pool fee tier (e.g. 500 = 0.05%, 3000 = 0.3%)
    uint24 public immutable poolFee;

    /// @notice Emitted when a user deposits USDC with their chain distribution.
    event Deposited(address indexed user, uint256 totalAmount, uint256[] chainIds, uint256[] chainAmounts);

    /// @notice Emitted when USDC is swapped and native token is dripped to a user.
    event Dripped(address indexed recipient, uint256 usdcAmountIn, uint256 nativeAmountOut);

    constructor(address _usdc, address _swapRouter, address _weth, uint24 _poolFee) {
        require(_usdc != address(0), "USDC addr zero");
        require(_swapRouter != address(0), "Router addr zero");
        require(_weth != address(0), "WETH addr zero");
        require(_poolFee > 0, "poolFee = 0");

        usdc = IERC20(_usdc);
        swapRouter = ISwapRouter(_swapRouter);
        weth = IWETH(_weth);
        poolFee = _poolFee;
    }

    /// @notice Allow contract to receive native token when unwrapping WETH.
    receive() external payable {}

    // user deposits USDC to the contract along with the chainds and amounts for each chain
    function deposit(uint256 totalAmount, uint256[] calldata chainIds, uint256[] calldata chainAmounts)
        external
        nonReentrant
    {
        require(totalAmount > 0, "totalAmount = 0");
        require(chainIds.length == chainAmounts.length && chainIds.length > 0, "array length mismatch");

        uint256 sum;
        uint256 len = chainAmounts.length;
        for (uint256 i = 0; i < len; i++) {
            sum += chainAmounts[i];
        }

        require(sum == totalAmount, "amounts do not sum to totalAmount");

        // Pull USDC from user
        usdc.safeTransferFrom(msg.sender, address(this), totalAmount);

        emit Deposited(msg.sender, totalAmount, chainIds, chainAmounts);
    }

    // called only by the owner, it will drip the usdc amount in the native token of the chain to the recipient
    function drip(uint256 usdcAmount, address recipient) external onlyOwner nonReentrant {
        require(recipient != address(0), "recipient = zero");
        require(usdcAmount > 0, "usdcAmount = 0");

        // Check balance
        uint256 balance = usdc.balanceOf(address(this));
        require(balance >= usdcAmount, "insufficient USDC");

        // Approve router for this exact amount (reset first for safety)
        usdc.safeApprove(address(swapRouter), 0);
        usdc.safeApprove(address(swapRouter), usdcAmount);

        // Swap USDC -> WETH (output to this contract)
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: address(usdc),
            tokenOut: address(weth),
            fee: poolFee,
            recipient: address(this),
            deadline: block.timestamp + 300, // 5 min deadline
            amountIn: usdcAmount,
            amountOutMinimum: 0, // MVP: no slippage check
            sqrtPriceLimitX96: 0 // no price limit
        });

        uint256 wethReceived = swapRouter.exactInputSingle(params);

        // Unwrap WETH -> native token
        weth.withdraw(wethReceived);

        // Forward the native token to the user
        (bool ok,) = recipient.call{value: wethReceived}("");
        require(ok, "native transfer failed");

        emit Dripped(recipient, usdcAmount, wethReceived);
    }
}
