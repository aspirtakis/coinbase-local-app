import React, { useState, useEffect, useRef } from "react";

const ConsoleLogs = () => {
  const [logs, setLogs] = useState([]);
  const logsEndRef = useRef(null);

  useEffect(() => {
    // Save the original console.log function
    const originalConsoleLog = console.log;

    // Override console.log
    console.log = (...args) => {
      const logMessage = args.join(" ");
      setLogs((prevLogs) => [...prevLogs, logMessage]); // Append new log
      originalConsoleLog(...args); // Call the original console.log
    };

    // Cleanup on unmount
    return () => {
      console.log = originalConsoleLog;
    };
  }, []);

  // Scroll to the bottom of the log container when new logs are added
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  return (
    <div
      style={{
        maxHeight: "100px",
        overflowY: "auto",
        backgroundColor: "#1e1e1e",
        color: "#ffffff",
        padding: "10px",
        fontFamily: "monospace",
        border: "1px solid #333",
        borderRadius: "4px",
      }}
    >
      {logs.map((log, index) => (
        <div key={index}>{log}</div>
      ))}
      {/* This element will ensure auto-scroll */}
      <div ref={logsEndRef}></div>
    </div>
  );
};

export default ConsoleLogs;
