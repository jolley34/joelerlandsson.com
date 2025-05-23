import { BrowserRouter as Router } from "react-router-dom";
import Footer from "./components/Footer/Footer";
import Scene from "./components/Scene/Scene";
import GlobalStyles from "./styles/GlobalStyles";

function App() {
  return (
    <>
      <GlobalStyles />
      <Router>
        <Scene />
        <Footer />
      </Router>
    </>
  );
}

export default App;
