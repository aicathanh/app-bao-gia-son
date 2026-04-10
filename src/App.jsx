import { Routes, Route, Link } from 'react-router-dom';
import DesktopApp from './components/DesktopApp';
import MobileApp from './components/MobileApp';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<DesktopApp />} />
      <Route path="/mobile" element={<MobileApp />} />
    </Routes>
  );
};

export default App;
