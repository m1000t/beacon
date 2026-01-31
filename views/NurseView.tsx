
import React, { useState } from 'react';
import { store, formatClinicalTime } from '../db';
import { ApptStatus, TaskPriority, User, AppState } from '../types';
import { COLORS } from '../constants';

interface NurseViewProps {
  user: User;
  state: AppState;
}

const formatDate = (d: any) => {
  const date = new Date(d);
  if (isNaN(date.getTime())) return "TBD";
  return date.toLocaleDateString();
};

const NurseView: React.FC<NurseViewProps> = ({ user, state }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'REFERRALS' | 'PATIENTS'>('OVERVIEW');

  const pendingTasks = state.tasks.filter(t => t.status === 'PENDING');
  const missedAppts = state.appointments.filter(a => a.status === ApptStatus.MISSED);
  const scheduledAppts = state.appointments.filter(a => a.status === ApptStatus.SCHEDULED || a.status === ApptStatus.CONFIRMED);

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Beacon Command Center</h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Institutional Operations • {new Date().toDateString()}</p>
        </div>
        <div className="flex bg-slate-200 p-1 rounded">
          {(['OVERVIEW', 'REFERRALS', 'PATIENTS'] as const).map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${activeTab === tab ? 'bg-white shadow-sm text-amber-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Schedule Column */}
          <div className="lg:col-span-8 space-y-8">
            <div className="medical-card flex flex-col min-h-[600px] overflow-hidden border-t-4 border-t-amber-500">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <div>
                  <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Beacon Admission Queue</h2>
                  <p className="text-[10px] text-slate-400 font-medium">Beacon Medical Center Active Schedule</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500">PENDING:</span>
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">{scheduledAppts.length}</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full data-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Scheduled Time</th>
                      <th>Provider</th>
                      <th>Status</th>
                      <th className="text-right">Beacon Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduledAppts.map(appt => (
                      <tr key={appt.id} className="group hover:bg-slate-50">
                        <td>
                          <p className="font-bold text-slate-900 text-sm">{appt.patientName}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Chart #BC-{appt.patientId}</p>
                        </td>
                        <td>
                          <p className="text-xs font-semibold text-slate-700">{formatDate(appt.datetime)}</p>
                          <p className="text-[10px] text-amber-600 font-bold">{formatClinicalTime(appt.datetime)}</p>
                        </td>
                        <td className="text-xs text-slate-500 font-medium">{appt.provider}</td>
                        <td>
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border uppercase ${appt.status === ApptStatus.CONFIRMED ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                            {appt.status}
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => store.completeAppointment(appt.id)}
                              className="px-3 py-1 bg-emerald-600 text-white text-[9px] font-bold uppercase rounded shadow-sm hover:bg-emerald-700"
                            >
                              Resolve
                            </button>
                            <button 
                              onClick={() => store.rescheduleByHours(appt.id, 24)}
                              className="px-3 py-1 bg-white border border-slate-200 text-slate-600 text-[9px] font-bold uppercase rounded hover:bg-slate-50"
                            >
                              Shift 24h
                            </button>
                            <button 
                              onClick={() => store.cancelAppointmentById(appt.id)}
                              className="px-3 py-1 bg-white border border-rose-100 text-rose-600 text-[9px] font-bold uppercase rounded hover:bg-rose-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {scheduledAppts.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-20 text-center opacity-40 italic text-sm">No active clinical visits in Beacon.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="lg:col-span-4 space-y-8">
            <div className="medical-card flex flex-col h-[300px] overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Clinical Care Tasks</span>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full">{pendingTasks.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {pendingTasks.map(task => (
                  <div key={task.id} className="p-3 border border-slate-100 hover:bg-slate-50 transition-colors rounded">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-tight">{task.title}</h3>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${COLORS.risk[task.priority === TaskPriority.URGENT ? 'HIGH' : 'LOW']}`}>
                        {task.priority}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Due: {task.dueDate}</span>
                      <button 
                        onClick={() => store.resolveTask(task.id)}
                        className="text-[9px] font-bold text-amber-600 hover:text-amber-800 underline uppercase"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="medical-card flex flex-col h-[268px] overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200 bg-rose-50/50">
                <span className="text-[10px] font-bold text-rose-800 uppercase tracking-widest">Missed Encounter Alerts</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {missedAppts.map(appt => (
                  <div key={appt.id} className="p-3 border-l-4 border-l-rose-600 border border-slate-200 bg-white shadow-sm">
                    <h3 className="font-bold text-slate-900 text-[11px] uppercase tracking-tight">{appt.patientName}</h3>
                    <p className="text-[9px] text-slate-500 mt-0.5 font-medium uppercase italic">Beacon Location: {appt.location}</p>
                    <button 
                      onClick={() => store.rescheduleOneWeek(appt.id)}
                      className="mt-2 w-full bg-slate-900 text-white py-1.5 rounded text-[9px] font-bold uppercase tracking-widest hover:bg-slate-800"
                    >
                      Reschedule +7 Days
                    </button>
                  </div>
                ))}
                {missedAppts.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full opacity-20">
                    <p className="text-[10px] font-bold uppercase tracking-widest">No Active Alerts</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'REFERRALS' && (
        <div className="medical-card">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Patient</th>
                <th>Specialty</th>
                <th>Provider</th>
                <th>Urgency</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.referrals.map(ref => (
                <tr key={ref.id} className="hover:bg-slate-50">
                  <td className="text-[10px] font-bold text-slate-400">{ref.requestedDate}</td>
                  <td className="font-bold text-slate-800">{state.patients.find(p => p.id === ref.patientId)?.name}</td>
                  <td className="text-amber-800 font-bold text-xs uppercase tracking-wider">{ref.specialty}</td>
                  <td className="text-slate-600 text-xs">{ref.provider}</td>
                  <td>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${COLORS.risk[ref.urgency]}`}>
                      {ref.urgency}
                    </span>
                  </td>
                  <td>
                    <button className="text-[10px] font-bold text-amber-600 uppercase tracking-widest hover:underline">Manage</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'PATIENTS' && (
        <div className="medical-card">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>D.O.B</th>
                <th>Beacon Address</th>
                <th>Risk Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.patients.map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="font-bold text-slate-800">{p.name}</td>
                  <td className="text-slate-500 text-xs">{p.dob}</td>
                  <td className="text-slate-500 text-xs">{p.address.split(',')[0]}</td>
                  <td>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${COLORS.risk[p.riskLevel]}`}>
                      {p.riskLevel}
                    </span>
                  </td>
                  <td>
                    <button className="text-[10px] font-bold text-amber-600 uppercase tracking-widest hover:underline">Full Chart</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default NurseView;
