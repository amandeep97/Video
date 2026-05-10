import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Creator from './pages/Creator.jsx';
import AlgorithmCracker from './pages/AlgorithmCracker.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create" element={<Creator />} />
      <Route path="/viral" element={<AlgorithmCracker />} />
    </Routes>
  );
}
