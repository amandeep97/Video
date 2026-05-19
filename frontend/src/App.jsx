import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Creator from './pages/Creator.jsx';
import AlgorithmCracker from './pages/AlgorithmCracker.jsx';
import TrendIntelligence from './pages/TrendIntelligence.jsx';
import VideoEditor from './pages/VideoEditor.jsx';
import ContentAlchemy from './pages/ContentAlchemy.jsx';
import ScriptLab from './pages/ScriptLab.jsx';
import ChannelLauncher from './pages/ChannelLauncher.jsx';
import GrowthTools from './pages/GrowthTools.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create" element={<Creator />} />
      <Route path="/viral" element={<AlgorithmCracker />} />
      <Route path="/trends" element={<TrendIntelligence />} />
      <Route path="/editor" element={<VideoEditor />} />
      <Route path="/alchemy" element={<ContentAlchemy />} />
      <Route path="/scriptlab" element={<ScriptLab />} />
      <Route path="/launch" element={<ChannelLauncher />} />
      <Route path="/tools" element={<GrowthTools />} />
    </Routes>
  );
}
