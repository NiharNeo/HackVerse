import React, { useState } from 'react';
import { jsPDF } from 'jspdf';

export default function AITripPlanner({ onConfirmPlan }) {
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    startDate: '',
    endDate: '',
    budget: 1000,
    people: 2
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Feedback States
  const [feedback, setFeedback] = useState({
    hotel: 4,
    transport: 4,
    restaurants: 4,
    activities: 4,
    note: ''
  });
  const [feedbackAnalysis, setFeedbackAnalysis] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFeedbackChange = (e) => {
    setFeedback({ ...feedback, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setFeedbackAnalysis(null);
    try {
      const response = await fetch('http://localhost:5005/api/plan-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!response.ok) {
        throw new Error("Failed to generate plan");
      }
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const analyzeTripFeedback = (feedbackObj) => {
    const ratings = [feedbackObj.hotel, feedbackObj.transport, feedbackObj.restaurants, feedbackObj.activities].map(value => Number(value) || 0);
    const averageScore = ratings.reduce((sum, value) => sum + value, 0) / ratings.length;

    let sentiment = 'Mixed';
    if (averageScore >= 4.5) sentiment = 'Excellent';
    else if (averageScore >= 3.8) sentiment = 'Positive';
    else if (averageScore >= 3.0) sentiment = 'Needs attention';

    const strengths = [];
    const concerns = [];

    if ((feedbackObj.hotel || 0) >= 4) strengths.push('Hotel stay matched the plan');
    else concerns.push('Hotel stay may need a better match');
    if ((feedbackObj.transport || 0) >= 4) strengths.push('Transport choices were convenient');
    else concerns.push('Transport times or comfort need tuning');
    if ((feedbackObj.restaurants || 0) >= 4) strengths.push('Dining recommendations landed well');
    else concerns.push('Restaurant suggestions need refinement');
    if ((feedbackObj.activities || 0) >= 4) strengths.push('Activities fit the travel style');
    else concerns.push('Activity pacing or variety could improve');

    return {
      averageScore: Number(averageScore.toFixed(1)),
      sentiment,
      strengths: strengths.length > 0 ? strengths : ['The trip plan stayed balanced overall'],
      concerns: concerns.length > 0 ? concerns : ['No major issues reported']
    };
  };

  const submitFeedback = () => {
    const analysis = analyzeTripFeedback(feedback);
    setFeedbackAnalysis(analysis);
  };

  const handleDownloadAutoReport = () => {
    if (!result) return;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const maxWidth = pageWidth - margin * 2;
    let cursorY = 56;

    doc.setFillColor(0, 175, 135); // #00af87
    doc.rect(0, 0, pageWidth, 92, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('AI Trip Report', margin, 38);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Destination: ${formData.destination} | ${formData.startDate} to ${formData.endDate}`, margin, 58);

    doc.setTextColor(25, 28, 29);
    cursorY = 120;

    const addText = (text, isBold = false, fontSize = 10, isHeading = false) => {
      if (cursorY > pageHeight - 48) {
        doc.addPage();
        cursorY = 48;
      }
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.setFontSize(fontSize);
      const wrapped = doc.splitTextToSize(text, maxWidth);
      doc.text(wrapped, margin, cursorY);
      cursorY += wrapped.length * (fontSize * 1.2) + (isHeading ? 8 : 4);
    };

    addText('Trip Overview', true, 14, true);
    addText(result.overview || '');
    cursorY += 10;

    if (feedbackAnalysis) {
      addText('Feedback Analysis', true, 14, true);
      addText(`Score: ${feedbackAnalysis.averageScore}/5 (${feedbackAnalysis.sentiment})`);
      addText('Highlights:', true);
      feedbackAnalysis.strengths.forEach(s => addText(`- ${s}`));
      addText('Areas for Improvement:', true);
      feedbackAnalysis.concerns.forEach(c => addText(`- ${c}`));
      if (feedback.note) {
        addText('User Note:', true);
        addText(feedback.note);
      }
      cursorY += 10;
    }

    addText('Accommodations & Travel', true, 14, true);
    addText(`Hotel: ${result.accommodation?.name || 'N/A'} ($${result.accommodation?.pricePerNight || 0}/night)`);
    addText(`Transport: ${result.travel?.type || 'N/A'} ($${result.travel?.cost || 0})`);
    cursorY += 10;

    addText('Daily Itinerary', true, 14, true);
    result.schedule?.forEach(day => {
      addText(`Day ${day.day}: ${day.title}`, true, 12);
      day.activities?.forEach(act => addText(`- ${act}`));
      cursorY += 6;
    });

    const safeDest = (formData.destination || 'trip').replace(/[^a-z0-9]/gi, '-').toLowerCase();
    doc.save(`trip-report-${safeDest}.pdf`);
  };

  return (
    <div className="min-h-screen pt-24 pb-32 px-4 flex flex-col items-center">
      <div className="w-full max-w-4xl text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00af87] to-blue-400 mb-4 tracking-tight">
          AI Trip Planner
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Tell us your dream destination, budget, and dates, and our advanced AI will craft the perfect itinerary just for you.
        </p>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Input Form Form */}
        <div className="lg:col-span-5 bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl h-fit">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Starting Location (Origin)</label>
                <input
                  required
                  type="text"
                  name="origin"
                  value={formData.origin}
                  onChange={handleChange}
                  placeholder="e.g. New York, USA"
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00af87] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Destination</label>
                <input
                  required
                  type="text"
                  name="destination"
                  value={formData.destination}
                  onChange={handleChange}
                  placeholder="e.g. Paris, France"
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00af87] transition-colors"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Start Date</label>
                <input
                  required
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00af87] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">End Date</label>
                <input
                  required
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00af87] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                <span>Total Budget ($)</span>
                <span className="text-[#00af87]">${formData.budget}</span>
              </label>
              <input
                type="range"
                name="budget"
                min="500"
                max="20000"
                step="100"
                value={formData.budget}
                onChange={handleChange}
                className="w-full accent-[#00af87]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Number of People</label>
              <input
                required
                type="number"
                name="people"
                min="1"
                max="20"
                value={formData.people}
                onChange={handleChange}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00af87] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full bg-[#00af87] hover:bg-[#00d8a5] text-slate-950 font-black py-4 rounded-xl flex justify-center items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                  <span>Planning Your Trip...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-xl">auto_awesome</span>
                  <span>Generate Itinerary</span>
                </>
              )}
            </button>
            {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
          </form>
        </div>

        {/* Results View */}
        <div className="lg:col-span-7">
          {!result && !loading && (
            <div className="h-full min-h-[400px] border border-dashed border-slate-700/50 rounded-3xl flex flex-col items-center justify-center text-slate-500 p-8">
              <span className="material-symbols-outlined text-6xl mb-4 opacity-50">travel_explore</span>
              <p className="text-lg text-center">Fill out the form to generate your AI-powered trip plan.</p>
            </div>
          )}
          
          {loading && (
            <div className="h-full min-h-[400px] border border-slate-800/50 bg-slate-900/30 rounded-3xl flex flex-col items-center justify-center p-8 animate-pulse">
              <div className="w-16 h-16 border-4 border-[#00af87]/30 border-t-[#00af87] rounded-full animate-spin mb-6"></div>
              <p className="text-[#00af87] font-medium tracking-widest uppercase">Consulting Travel AI...</p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
              {/* Overview */}
              <div className="bg-gradient-to-br from-blue-900/40 to-slate-900/80 backdrop-blur-xl border border-blue-500/30 rounded-3xl p-6 shadow-xl">
                <h2 className="text-2xl font-bold text-white mb-3">Trip Overview</h2>
                <p className="text-slate-300 leading-relaxed">{result.overview}</p>
              </div>

              {/* Accomodation & Travel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-[#00af87] mb-2">
                    <span className="material-symbols-outlined">hotel</span>
                    <h3 className="font-bold uppercase tracking-wider text-xs">Accommodation</h3>
                  </div>
                  <h4 className="text-xl font-bold text-white">{result.accommodation?.name || "Recommended Stay"}</h4>
                  <p className="text-slate-400 text-sm flex-1">{result.accommodation?.description}</p>
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-800">
                    <span className="text-amber-400 font-bold flex items-center gap-1"><span className="material-symbols-outlined text-sm">star</span> {result.accommodation?.rating || "4.5"}</span>
                    <span className="text-white font-mono">${result.accommodation?.pricePerNight || 0}<span className="text-slate-500 text-sm">/night</span></span>
                  </div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 flex flex-col gap-2 relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 bg-[#00af87]/20 text-[#00af87] text-[10px] font-black uppercase tracking-widest px-8 py-1 rotate-45 shadow-sm">
                    Cheapest Option
                  </div>
                  <div className="flex items-center gap-2 text-blue-400 mb-2">
                    <span className="material-symbols-outlined">directions_bus</span>
                    <h3 className="font-bold uppercase tracking-wider text-xs">Travel Info</h3>
                  </div>
                  <h4 className="text-xl font-bold text-white">{result.travel?.type || "Transport"}</h4>
                  <p className="text-slate-400 text-sm flex-1">{result.travel?.details}</p>
                  
                  {result.travel?.cheapestTransport && (
                    <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl p-3 mt-2">
                      <p className="text-xs text-blue-300 font-semibold flex items-start gap-1">
                        <span className="material-symbols-outlined text-[14px]">savings</span>
                        <span>{result.travel.cheapestTransport}</span>
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-800">
                    <span className="text-slate-500 text-sm uppercase">Est. Cost</span>
                    <span className="text-white font-mono">${result.travel?.cost || 0}</span>
                  </div>
                </div>
              </div>

              {/* Utility & Smart Guides (New AI Features) */}
              {(result.currencyExchange || result.packingList || result.localEtiquette) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Currency & Emergency Contacts */}
                  <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6">
                    <div className="flex items-center gap-2 text-emerald-400 mb-4">
                      <span className="material-symbols-outlined">currency_exchange</span>
                      <h3 className="font-bold uppercase tracking-wider text-xs">Currency & Safety</h3>
                    </div>
                    
                    {result.currencyExchange && result.currencyExchange.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-2">Offline Exchange Kiosks</h4>
                        <ul className="space-y-2">
                          {result.currencyExchange.map((exchange, idx) => (
                            <li key={idx} className="bg-slate-950/50 rounded-lg p-2 border border-slate-800/50">
                              <p className="text-white text-xs font-bold">{exchange.name}</p>
                              <p className="text-slate-400 text-[10px]">{exchange.address}</p>
                              <p className="text-emerald-400 text-[10px] mt-0.5 italic">{exchange.tip}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.emergencyContacts && (
                      <div className="pt-2 border-t border-slate-800">
                        <h4 className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-2">Emergency Contacts</h4>
                        <div className="flex gap-4">
                          <div className="flex items-center gap-1.5 text-xs text-rose-400 font-mono">
                            <span className="material-symbols-outlined text-sm">local_police</span>
                            {result.emergencyContacts.police || '112'}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-rose-400 font-mono">
                            <span className="material-symbols-outlined text-sm">medical_services</span>
                            {result.emergencyContacts.ambulance || '112'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Packing List & Etiquette */}
                  <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6">
                    <div className="flex items-center gap-2 text-amber-400 mb-4">
                      <span className="material-symbols-outlined">luggage</span>
                      <h3 className="font-bold uppercase tracking-wider text-xs">Packing & Etiquette</h3>
                    </div>

                    {result.packingList && result.packingList.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-2">Smart Packing List</h4>
                        <ul className="space-y-1.5">
                          {result.packingList.map((item, idx) => (
                            <li key={idx} className="text-slate-300 text-xs flex items-start gap-2">
                              <span className="text-amber-500">•</span> {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.localEtiquette && result.localEtiquette.length > 0 && (
                      <div className="pt-3 border-t border-slate-800">
                        <h4 className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-2">Local Etiquette</h4>
                        <ul className="space-y-1.5">
                          {result.localEtiquette.map((tip, idx) => (
                            <li key={idx} className="text-slate-300 text-[11px] flex items-start gap-2 italic">
                              <span className="text-indigo-400">💡</span> {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* Itinerary */}
              <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6">
                <div className="flex items-center gap-2 text-purple-400 mb-6">
                  <span className="material-symbols-outlined">calendar_month</span>
                  <h3 className="font-bold uppercase tracking-wider text-xs">Daily Itinerary</h3>
                </div>
                
                <div className="space-y-8 pl-2">
                  {result.schedule?.map((day, idx) => (
                    <div key={idx} className="relative pl-6 border-l-2 border-slate-800 pb-2 last:pb-0 last:border-transparent">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-900 border-2 border-purple-500"></div>
                      <h4 className="text-lg font-bold text-white mb-1 leading-none -mt-1">
                        Day {day.day} <span className="text-slate-500 font-normal mx-2">|</span> <span className="text-purple-300">{day.title}</span>
                      </h4>
                      <ul className="mt-4 space-y-3">
                        {day.activities?.map((activity, actIdx) => (
                          <li key={actIdx} className="text-slate-300 flex items-start gap-3 text-sm">
                            <span className="material-symbols-outlined text-slate-600 text-sm mt-0.5">check_circle</span>
                            <span>{activity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feedback Form */}
              {!feedbackAnalysis && (
                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl animate-in fade-in slide-in-from-bottom-8 duration-700">
                  <h3 className="text-xl font-bold text-white mb-4">Rate This Itinerary</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    {['hotel', 'transport', 'restaurants', 'activities'].map((category) => (
                      <div key={category}>
                        <label className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                          <span>{category}</span>
                          <span className="text-[#00af87]">{feedback[category]}/5</span>
                        </label>
                        <input
                          type="range"
                          name={category}
                          min="1"
                          max="5"
                          step="1"
                          value={feedback[category]}
                          onChange={handleFeedbackChange}
                          className="w-full accent-[#00af87]"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Additional Note (Optional)</label>
                    <textarea
                      name="note"
                      value={feedback.note}
                      onChange={handleFeedbackChange}
                      rows="2"
                      placeholder="What did you like or dislike?"
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00af87] transition-colors"
                    />
                  </div>
                  <button
                    onClick={submitFeedback}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded-xl flex justify-center items-center gap-2 transition-all"
                  >
                    <span className="material-symbols-outlined">analytics</span>
                    Analyze Feedback
                  </button>
                </div>
              )}

              {/* Feedback Analysis Display & Auto Report Generator */}
              {feedbackAnalysis && (
                <div className="bg-gradient-to-br from-[#00af87]/10 to-slate-900/80 backdrop-blur-xl border border-[#00af87]/40 rounded-3xl p-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-2 text-[#00af87] mb-4">
                    <span className="material-symbols-outlined text-3xl">psychology</span>
                    <h3 className="text-2xl font-bold text-white">Feedback Analysis</h3>
                  </div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="text-5xl font-black text-[#00af87]">{feedbackAnalysis.averageScore}</div>
                    <div>
                      <div className="text-sm text-slate-400 uppercase tracking-widest">Average Score</div>
                      <div className="text-lg text-white font-medium">{feedbackAnalysis.sentiment}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-slate-950/40 rounded-2xl p-4">
                      <h4 className="text-green-400 font-bold mb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">thumb_up</span> Highlights
                      </h4>
                      <ul className="space-y-1">
                        {feedbackAnalysis.strengths.map((str, idx) => (
                          <li key={idx} className="text-slate-300 text-sm flex items-start gap-2">
                            <span className="text-green-500">•</span> {str}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-slate-950/40 rounded-2xl p-4">
                      <h4 className="text-amber-400 font-bold mb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">build</span> Needs Attention
                      </h4>
                      <ul className="space-y-1">
                        {feedbackAnalysis.concerns.map((con, idx) => (
                          <li key={idx} className="text-slate-300 text-sm flex items-start gap-2">
                            <span className="text-amber-500">•</span> {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <button
                    onClick={handleDownloadAutoReport}
                    className="w-full bg-[#00af87] hover:bg-[#00d8a5] text-slate-950 font-black py-4 rounded-xl flex justify-center items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
                    <span>Download Auto Report</span>
                  </button>

                  <button
                    onClick={() => onConfirmPlan && onConfirmPlan({ formData, result })}
                    className="w-full mt-4 bg-white hover:bg-slate-200 text-[#002D40] font-black py-4 rounded-xl flex justify-center items-center gap-2 transition-all shadow-lg"
                  >
                    <span className="material-symbols-outlined text-xl">check_circle</span>
                    <span>Confirm & Book This Itinerary</span>
                  </button>
                </div>
              )}
              
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
