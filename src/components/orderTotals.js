import React, { useState ,useEffect} from "react";

const OrderTotalsTable = ({ orderTotals, onRowClick ,handlerefresh}) => {
  const [sortDirection, setSortDirection] = useState("desc"); // Default sort is descending
  const [sortedOrders, setSortedOrders] = useState(orderTotals);


  useEffect(() => {
setSortedOrders(orderTotals)
  }, [orderTotals]);
  // Sorting logic
  const handleSort = () => {
    const newDirection = sortDirection === "asc" ? "desc" : "asc";
    setSortDirection(newDirection);

    const sorted = [...orderTotals].sort((a, b) => {
      const profitA = parseFloat(a.totalProfitDollars);
      const profitB = parseFloat(b.totalProfitDollars);

      return newDirection === "asc" ? profitA - profitB : profitB - profitA;
    });

    setSortedOrders(sorted);
  };

  // Calculate totals
  const totalProfitDollars = orderTotals
    .reduce((acc, order) => acc + parseFloat(order.totalProfitDollars), 0)
    .toFixed(2);

  const averageProfitPercentage = orderTotals.length
    ? (
        orderTotals.reduce(
          (acc, order) => acc + parseFloat(order.profitPercentage),
          0
        ) / orderTotals.length
      ).toFixed(2)
    : 0;

  const totalPaymentWithCommission = orderTotals
    .reduce((acc, order) => acc + parseFloat(order.totalPaymentWithCommission), 0)
    .toFixed(2);

  return (
    <div>
      {/* Totals Line */}
           {/* Sorting Button */}
           <div style={{ marginBottom: "10px", textAlign: "right" }}>
        <button onClick={handleSort}>
          Sort by Profit ({sortDirection === "asc" ? "Ascending" : "Descending"})
        </button>
        <button onClick={handlerefresh}>
          Refresh
        </button>
      </div>
      <div
        style={{
          marginBottom: "16px",
          fontWeight: "bold",
        }}
      >
        Opened: ${totalPaymentWithCommission} | Total Profit: ${totalProfitDollars} | Average Profit Percentage: {averageProfitPercentage}%
      </div>

 

      {/* Scrollable Table */}
      <div
        style={{
          maxHeight: "400px",
          overflowY: "auto",
          border: "1px solid black",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid black", padding: "8px" }}>Pair</th>
              <th style={{ border: "1px solid black", padding: "8px" }}>Total Profit ($)</th>
              <th style={{ border: "1px solid black", padding: "8px" }}>Profit Percentage (%)</th>
              <th style={{ border: "1px solid black", padding: "8px" }}>
                Total Payment with Commission ($)
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedOrders.map((order, index) => (
              <tr
                key={index}
                style={{
                  backgroundColor:
                    parseFloat(order.totalProfitDollars) > 0
                      ? "lightgreen"
                      : "lightcoral",
                }}
                onClick={() => {
                  onRowClick(order.pair, order.balance);
                }}
              >
                <td style={{ border: "1px solid black", padding: "8px" }}>{order.pair}</td>
                <td style={{ border: "1px solid black", padding: "8px" }}>
                  {order.totalProfitDollars}
                </td>
                <td style={{ border: "1px solid black", padding: "8px" }}>
                  {order.profitPercentage}
                </td>
                <td style={{ border: "1px solid black", padding: "8px" }}>
                  {order.totalPaymentWithCommission}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderTotalsTable;
