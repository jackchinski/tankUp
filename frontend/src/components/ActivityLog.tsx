import React from "react";
import { useGasFountain } from "../context/GasFountainContext";
import { Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { HistoryItem } from "../types";

const ActivityLog: React.FC = () => {
  const { history } = useGasFountain();

  const getStatusIcon = (status: HistoryItem["status"]): React.ReactElement => {
    switch (status) {
      case "Success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "Failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "Pending":
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-secondary" />;
    }
  };

  return (
    <div className="w-full mt-12 border-t border-border pt-8">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-primary" />
        Recent Activity
      </h3>

      <div className="bg-muted/30 rounded-xl border border-border overflow-hidden">
        {history.length === 0 ? (
          <div className="p-8 text-center text-secondary">
            No recent activity
          </div>
        ) : (
          <div className="divide-y divide-border">
            {history.map((item) => (
              <div
                key={item.id}
                className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  {getStatusIcon(item.status)}
                  <div>
                    <div className="font-medium">Dispersed ${item.amount}</div>
                    <div className="text-xs text-secondary">
                      {new Date(item.timestamp).toLocaleDateString()} •{" "}
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-secondary">
                    {item.chains} chains
                  </div>
                  <div
                    className={`text-xs px-2 py-1 rounded-full ${
                      item.status === "Success"
                        ? "bg-green-500/10 text-green-500"
                        : item.status === "Failed"
                        ? "bg-red-500/10 text-red-500"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {item.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLog;
