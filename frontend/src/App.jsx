import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Creator from './pages/Creator.jsx';
import AlgorithmCracker from './pages/AlgorithmCracker.jsx';
import TrendIntelligence from './pages/TrendIntelligence.jsx';
import VideoEditor from './pages/VideoEditor.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create" element={<Creator />} />
      <Route path="/viral" element={<AlgorithmCracker />} />
      <Route path="/trends" element={<TrendIntelligence />} />
      <Route path="/editor" element={<VideoEditor />} />
    </Routes>
  );
}
