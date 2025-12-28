import React, { useState, useEffect } from 'react';
import { Sparkles, Users, Briefcase, Plus, Search, ChevronRight, CheckCircle2, Clock } from 'lucide-react';
import { fetchOpportunities, createOpportunity, fetchOpportunityMatches } from '../src/lib/api';

interface Opportunity {
  id: number;
  title: string;
  description: string;
  required_skills: string[];
  status: string;
  created_at: string;
}

interface Match {
  memberId: number;
  name: string;
  skills: string[];
  matchScore: number;
}

const VolunteerMatching: React.FC = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOpp, setNewOpp] = useState({ title: '', description: '', requiredSkills: '' });

  useEffect(() => {
    loadOpportunities();
  }, []);

  const loadOpportunities = async () => {
    setLoading(true);
    try {
      const data = await fetchOpportunities();
      setOpportunities(data);
    } catch (error) {
      console.error('Failed to load opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOpp = async (opp: Opportunity) => {
    setSelectedOpp(opp);
    try {
      const { matches } = await fetchOpportunityMatches(opp.id.toString());
      setMatches(matches);
    } catch (error) {
      console.error('Failed to fetch matches:', error);
    }
  };

  const handleCreateOpp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const skillsArray = newOpp.requiredSkills.split(',').map(s => s.trim()).filter(s => s);
      await createOpportunity({ ...newOpp, requiredSkills: skillsArray });
      setIsModalOpen(false);
      setNewOpp({ title: '', description: '', requiredSkills: '' });
      loadOpportunities();
    } catch (error) {
      console.error('Failed to create opportunity:', error);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            ServantHeart <Sparkles className="text-amber-500" size={24} />
          </h1>
          <p className="text-slate-500 mt-1">Match member talents to ministry needs using GraceAI.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-sm font-medium"
        >
          <Plus size={18} />
          Post Opportunity
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Opportunities List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-1">Open Opportunities</h2>
          {loading ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-100 flex justify-center">
              <Clock className="animate-spin text-indigo-500" />
            </div>
          ) : opportunities.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center text-slate-500">
              No active opportunities found.
            </div>
          ) : (
            opportunities.map(opp => (
              <button
                key={opp.id}
                onClick={() => handleSelectOpp(opp)}
                className={`w-full text-left p-5 rounded-2xl border transition-all ${
                  selectedOpp?.id === opp.id 
                    ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-100' 
                    : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'
                }`}
              >
                <div className="font-bold text-slate-900 mb-1">{opp.title}</div>
                <div className="text-xs text-slate-500 line-clamp-2">{opp.description}</div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {opp.required_skills.slice(0, 3).map(skill => (
                    <span key={skill} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                      {skill}
                    </span>
                  ))}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Matching Registry */}
        <div className="lg:col-span-2">
          {selectedOpp ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{selectedOpp.title}</h3>
                    <p className="text-slate-600 mt-2">{selectedOpp.description}</p>
                  </div>
                  <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 size={12} /> {selectedOpp.status}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedOpp.required_skills.map(skill => (
                    <span key={skill} className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-6">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-500" /> GraceAI Talent Matches
                </h4>
                
                <div className="space-y-3">
                  {matches.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 italic">
                      No exact talent matches found yet. Try broadening your skill requirements.
                    </div>
                  ) : (
                    matches.map(match => (
                      <div key={match.memberId} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border border-slate-200 text-indigo-600 font-bold">
                            {match.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{match.name}</div>
                            <div className="text-xs text-slate-500 flex gap-1 mt-1">
                              {match.skills.slice(0, 3).map(s => (
                                <span key={s}>#{s}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-indigo-600 font-bold text-lg">{(match.matchScore * 100).toFixed(0)}%</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Match Confidence</div>
                          </div>
                          <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                            <ChevronRight size={24} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 h-full flex flex-col items-center justify-center p-12 text-center text-slate-400 min-h-[500px]">
              <Briefcase size={48} className="mb-4 opacity-50" />
              <h3 className="text-lg font-bold">Select an Opportunity</h3>
              <p className="max-w-xs mt-2">Choose a ministry position on the left to see AI-recommended matches from your membership.</p>
            </div>
          )}
        </div>
      </div>

      {/* Post Opportunity Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 bg-indigo-900 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">Post New Opportunity</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-white hover:opacity-75">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleCreateOpp} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Position Title</label>
                <input 
                  required
                  type="text" 
                  placeholder="e.g. Nursery Volunteer, Tech Team Lead"
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  value={newOpp.title}
                  onChange={e => setNewOpp({...newOpp, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Description</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Describe the role and commitment..."
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  value={newOpp.description}
                  onChange={e => setNewOpp({...newOpp, description: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Required Skills (comma separated)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Teaching, Audio/Video, Childcare"
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  value={newOpp.requiredSkills}
                  onChange={e => setNewOpp({...newOpp, requiredSkills: e.target.value})}
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                >
                  <Briefcase size={18} />
                  Post Position
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VolunteerMatching;
