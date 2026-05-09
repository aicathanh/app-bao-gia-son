import { Routes, Route, Link } from 'react-router-dom';
import DesktopApp from './components/DesktopApp';
import MobileApp from './components/MobileApp';
import StaffDesktopApp from './components/StaffDesktopApp';
import StaffMobileApp from './components/StaffMobileApp';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<DesktopApp />} />
      <Route path="/mobile" element={<MobileApp />} />
      <Route path="/team-quote" element={<StaffDesktopApp />} />
      <Route path="/team-quote/mobile" element={<StaffMobileApp />} />
    </Routes>
  );
};

export default App;
