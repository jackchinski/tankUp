// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IERC20Like {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IMockWETH {
    function mint(address to, uint256 amount) external;
}

contract MockSwapRouter {
    address public immutable usdc;
    address public immutable weth;

    constructor(address _usdc, address _weth) {
        usdc = _usdc;
        weth = _weth;
    }

    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    // 1:1 USDC(6) -> WETH(18) using 1e12 scaling
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut) {
        require(params.tokenIn == usdc, "tokenIn");
        require(params.tokenOut == weth, "tokenOut");

        // pull USDC from caller (GasStation) using prior approval
        IERC20Like(usdc).transferFrom(msg.sender, address(this), params.amountIn);

        amountOut = params.amountIn * 1e12; // 6 -> 18 decimals
        IMockWETH(weth).mint(params.recipient, amountOut);
    }
}
