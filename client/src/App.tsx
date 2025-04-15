import React, { useEffect } from "react";
import RubiksCube from "./components/RubiksCube";
import "@fontsource/inter";

function App() {
  return (
    <div className="w-screen h-screen overflow-hidden bg-gray-100">
      <RubiksCube />
    </div>
  );
}

export default App;
