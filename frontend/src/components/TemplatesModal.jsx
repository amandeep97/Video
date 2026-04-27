import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';

const TEMPLATES = [
  { category: 'Business', emoji: '💼', items: [
    { topic: '5 Ways to Grow Your Small Business in 2025', style: 'professional', duration: 60 },
    { topic: 'How to Start an Online Store with Zero Budget', style: 'educational', duration: 90 },
    { topic: 'Morning Routine of Successful Entrepreneurs', style: 'motivational', duration: 60 },
    { topic: 'How to Make Money with Freelancing', style: 'professional', duration: 60 },
  ]},
  { category: 'Social Media', emoji: '📱', items: [
    { topic: '10 Life Hacks That Will Change Your Life', style: 'social', duration: 45 },
    { topic: 'My Productivity Morning Routine', style: 'social', duration: 60 },
    { topic: 'How I Made Money Online This Month', style: 'social', duration: 60 },
    { topic: '5 Apps You Need on Your Phone in 2025', style: 'social', duration: 45 },
  ]},
  { category: 'Motivational', emoji: '🔥', items: [
    { topic: 'Never Give Up — Inspirational Message', style: 'motivational', duration: 60 },
    { topic: 'How to Build Confidence and Self-Belief', style: 'motivational', duration: 60 },
    { topic: 'Success Mindset: Think Like a Winner', style: 'motivational', duration: 60 },
    { topic: 'Stop Wasting Time — Change Your Life Now', style: 'motivational', duration: 45 },
  ]},
  { category: 'Education', emoji: '📚', items: [
    { topic: 'Learn Python Programming in 5 Minutes', style: 'educational', duration: 60 },
    { topic: 'How AI is Changing the World in 2025', style: 'documentary', duration: 90 },
    { topic: '10 Amazing Facts About Space', style: 'educational', duration: 60 },
    { topic: 'How the Internet Works — Simply Explained', style: 'educational', duration: 60 },
  ]},
  { category: 'Technology', emoji: '🤖', items: [
    { topic: 'Top 5 AI Tools You Must Use in 2025', style: 'professional', duration: 60 },
    { topic: 'ChatGPT vs Claude — Which AI is Better?', style: 'documentary', duration: 60 },
    { topic: 'Beginners Guide to Cryptocurrency', style: 'educational', duration: 90 },
    { topic: 'How to Protect Your Privacy Online', style: 'educational', duration: 60 },
  ]},
  { category: 'Health', emoji: '💪', items: [
    { topic: '10 Minute Morning Workout at Home', style: 'educational', duration: 60 },
    { topic: 'Healthy Eating on a Tight Budget', style: 'educational', duration: 60 },
    { topic: 'Mental Health Tips for Busy People', style: 'professional', duration: 60 },
    { topic: 'How to Sleep Better Every Night', style: 'educational', duration: 60 },
  ]},
  { category: 'Travel', emoji: '✈️', items: [
    { topic: 'Top 10 Budget Travel Destinations 2025', style: 'cinematic', duration: 90 },
    { topic: 'How to Travel the World for Free', style: 'social', duration: 60 },
    { topic: 'Hidden Gems in Asia You Must Visit', style: 'cinematic', duration: 60 },
    { topic: 'Best Street Food Around the World', style: 'documentary', duration: 60 },
  ]},
  { category: 'Cooking', emoji: '🍳', items: [
    { topic: 'Quick Healthy Recipes Under 15 Minutes', style: 'social', duration: 60 },
    { topic: 'Traditional Indian Street Food Guide', style: 'documentary', duration: 90 },
    { topic: 'Meal Prep for the Entire Week — Beginner Guide', style: 'educational', duration: 60 },
    { topic: 'Best Punjabi Dishes You Must Try', style: 'social', duration: 60 },
  ]},
];

export default function TemplatesModal({ onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState(TEMPLATES[0].category);

  const active = TEMPLATES.find(t => t.category === activeCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="card w-full max-w-2xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-brand-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Video Templates</h3>
              <p className="text-xs text-white/40">Pick a topic to get started instantly</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg glass glass-hover flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1.5 flex-wrap mb-4">
          {TEMPLATES.map(t => (
            <button key={t.category} onClick={() => setActiveCategory(t.category)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeCategory === t.category
                  ? 'bg-brand-500/25 border border-brand-500/50 text-white'
                  : 'glass text-white/50 border border-transparent hover:text-white'
              }`}>
              <span>{t.emoji}</span>
              <span>{t.category}</span>
            </button>
          ))}
        </div>

        {/* Template cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {active?.items.map((item, i) => (
            <button key={i} onClick={() => { onSelect(item); onClose(); }}
              className="glass glass-hover p-4 rounded-xl text-left group transition-all border border-white/5 hover:border-brand-500/30">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-white leading-snug group-hover:text-brand-300 transition-colors">
                  {item.topic}
                </p>
                <Sparkles className="w-3.5 h-3.5 text-brand-400 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 capitalize">{item.style}</span>
                <span className="text-[10px] text-white/30">{item.duration}s</span>
              </div>
            </button>
          ))}
        </div>

        <p className="text-[10px] text-white/20 text-center mt-4">
          Selecting a template fills in the topic — you can edit it before generating.
        </p>
      </div>
    </div>
  );
}
