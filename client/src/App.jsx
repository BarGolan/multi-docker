import "./App.css";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Fib from "./Fib";
import OtherPage from "./OtherPage";

function App() {
  console.log("App component rendered");
  return (
    <div className="App">
      <header>
        <h1>Fib Calculator</h1>
      </header>
      <BrowserRouter>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Link to="/"><h2>Fib</h2></Link>
          <Link to="/otherpage"><h2>Other Page</h2></Link>
        </div>
        <Routes>
          <Route path="/" element={<Fib />} />
          <Route path="/otherpage" element={<OtherPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
