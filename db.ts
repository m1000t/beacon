
import { 
  AppState, Role, RiskLevel, ApptStatus, ReferralStatus, 
  TransportStatus, TaskPriority, FollowUpTask, TransportRequest, Notification, Message, Appointment, User, Referral
} from './types';

interface ExtendedAppState extends AppState {
  systemConfig: {
    seniorMode: boolean;
    virtualDoctorActive: boolean;
    theme: 'clinical' | 'emergency';
  };
}

/**
 * Robust local time formatter to ensure UI matches user expectations.
 * Always formats the ISO string back into the user's local timezone.
 */
export const formatClinicalTime = (isoString: string) => {
  if (!isoString) return "TBD";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "TBD";
  
  return d.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });
};

/**
 * Handles incoming date/time strings.
 * AI often sends ISO strings with 'Z' but intends them as local time, or sends HH:mm.
 * This function forces the interpretation to be the patient's local time to prevent 
 * timezone shifts (e.g., 4 PM becoming 11 AM).
 */
const ensureValidDate = (dateInput: any): string => {
  if (!dateInput) return new Date().toISOString();

  // If HH:mm format
  if (typeof dateInput === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(dateInput)) {
    const [h, m] = dateInput.split(':');
    const d = new Date();
    d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
    return d.toISOString();
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return new Date().toISOString();

  return d.toISOString();
};

const INITIAL_DATA: ExtendedAppState = {
  users: [
    { id: 'u1', name: 'Nurse Sarah', role: Role.NURSE, phone: '555-0101' },
    { id: 'u2', name: 'Dr. James Wilson', role: Role.DOCTOR, phone: '555-0102' },
    { id: 'u3', name: 'Bill Driver', role: Role.DRIVER, phone: '555-0103' },
    { id: 'u4', name: 'Margaret Smith', role: Role.PATIENT, phone: '555-0104', patientId: 'p1' },
  ],
  patients: [
    { id: 'p1', name: 'Margaret Smith', dob: '1942-05-12', phone: '555-0104', address: '123 Ridge Rd, Clearwater', riskLevel: RiskLevel.HIGH, notes: 'Requires wheelchair access, post-hip surgery.' },
    { id: 'p2', name: 'Arthur Penhaligon', dob: '1938-11-20', phone: '555-0105', address: '45 Oak Ave', riskLevel: RiskLevel.MEDIUM, notes: 'Type 2 Diabetes management.' },
    { id: 'p3', name: 'Evelyn Reed', dob: '1945-02-15', phone: '555-0106', address: '78 Pine St', riskLevel: RiskLevel.LOW, notes: 'Bilateral cataracts.' },
  ],
  appointments: [
    { id: 'a1', patientId: 'p1', patientName: 'Margaret Smith', datetime: ensureValidDate('2025-05-20T09:00:00Z'), location: 'Beacon Medical Center', status: ApptStatus.SCHEDULED, provider: 'Dr. Heart' },
    { id: 'a2', patientId: 'p2', patientName: 'Arthur Penhaligon', datetime: ensureValidDate('2025-05-18T14:30:00Z'), location: 'Beacon Medical Center', status: ApptStatus.CONFIRMED, provider: 'Dr. Diabetes' },
    { id: 'a3', patientId: 'p1', patientName: 'Margaret Smith', datetime: ensureValidDate('2025-05-15T10:00:00Z'), location: 'Beacon Medical Center', status: ApptStatus.MISSED, provider: 'PT Jane' },
  ],
  transportRequests: [
    { id: 't1', patientId: 'p1', appointmentId: 'a1', pickupLocation: '123 Ridge Rd', destination: 'Beacon Medical Center', scheduledTime: ensureValidDate('2025-05-20T08:15:00Z'), status: TransportStatus.REQUESTED },
    { id: 't2', patientId: 'p2', appointmentId: 'a2', pickupLocation: '45 Oak Ave', destination: 'Beacon Medical Center', scheduledTime: ensureValidDate('2025-05-18T13:45:00Z'), status: TransportStatus.ASSIGNED, driverId: 'u3', driverName: 'Bill Driver' },
  ],
  referrals: [
    { id: 'r1', patientId: 'p1', specialty: 'Cardiology', provider: 'Beacon Medical Center', urgency: RiskLevel.HIGH, status: ReferralStatus.SENT, requestedDate: '2025-05-10' },
  ],
  tasks: [
    { id: 'k1', patientId: 'p1', title: 'Follow-up on missed PT appointment', priority: TaskPriority.URGENT, status: 'PENDING', dueDate: '2025-05-16' },
  ],
  messages: [],
  notifications: [
    { id: 'n-init', userId: 'u1', message: 'Welcome to the Beacon Care Coordination Portal.', status: 'unread', createdAt: new Date().toISOString() }
  ],
  systemConfig: {
    seniorMode: true,
    virtualDoctorActive: false,
    theme: 'clinical'
  }
};

class Store {
  private data: ExtendedAppState = INITIAL_DATA;
  private listeners: (() => void)[] = [];

  constructor() {
    const saved = localStorage.getItem('beacon_state_v4');
    if (saved) {
      try {
        this.data = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to restore state", e);
      }
    }
  }

  getState() { return { ...this.data }; }
  
  setState(newData: Partial<ExtendedAppState>) {
    this.data = { ...this.data, ...newData };
    localStorage.setItem('beacon_state_v4', JSON.stringify(this.data));
    this.notify();
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  toggleVirtualDoctor(active: boolean) {
    this.setState({ systemConfig: { ...this.data.systemConfig, virtualDoctorActive: active } });
    this.addNotification(active ? "VIRTUAL DOCTOR MODE ENGAGED" : "BEACON ASSISTANT ENGAGED");
  }

  setTheme(theme: 'clinical' | 'emergency') {
    this.setState({ systemConfig: { ...this.data.systemConfig, theme } });
  }

  addNotification(message: string, userId: string = 'u1') {
    const n: Notification = {
      id: `n-${Date.now()}`,
      userId,
      message,
      status: 'unread',
      createdAt: new Date().toISOString()
    };
    this.setState({ notifications: [n, ...this.data.notifications] });
  }

  markNotificationRead(id: string) {
    const notifications = this.data.notifications.map(n => 
      n.id === id ? { ...n, status: 'read' as const } : n
    );
    this.setState({ notifications });
  }

  addAppointment(patientName: string, datetime: string, location: string = 'Beacon Medical Center', provider: string = 'Staff Physician') {
    const patient = this.data.patients.find(p => p.name.toLowerCase().includes(patientName.toLowerCase()));
    if (!patient) return null;

    const validDatetime = ensureValidDate(datetime);

    const newAppt: Appointment = {
      id: `a-${Date.now()}`,
      patientId: patient.id,
      patientName: patient.name,
      datetime: validDatetime,
      location: 'Beacon Medical Center',
      status: ApptStatus.SCHEDULED,
      provider
    };
    
    this.setState({ appointments: [newAppt, ...this.data.appointments.filter(a => a.patientId !== patient.id || a.status !== ApptStatus.SCHEDULED)] });
    this.addNotification(`Scheduled: Beacon Medical Center visit for ${patient.name}.`);
    return newAppt;
  }

  removeAppointment(patientName: string) {
    const patient = this.data.patients.find(p => p.name.toLowerCase().includes(patientName.toLowerCase()));
    if (!patient) return false;
    const appts = this.data.appointments.filter(a => a.patientId !== patient.id);
    this.setState({ appointments: appts });
    this.addNotification(`Cancelled all visits for ${patient.name}.`);
    return true;
  }

  cancelAppointmentById(id: string) {
    this.setState({ 
      appointments: this.data.appointments.map(a => a.id === id ? { ...a, status: ApptStatus.CANCELLED } : a) 
    });
  }

  completeAppointment(id: string) {
    this.setState({ 
      appointments: this.data.appointments.map(a => a.id === id ? { ...a, status: ApptStatus.COMPLETED } : a) 
    });
    this.addNotification("Clinical encounter completed and recorded in Beacon.");
  }

  updateAppointmentTime(patientName: string, newDatetime: string) {
    const patient = this.data.patients.find(p => p.name.toLowerCase().includes(patientName.toLowerCase()));
    if (!patient) return false;
    const validTime = ensureValidDate(newDatetime);
    const appts = this.data.appointments.map(a => 
      (a.patientId === patient.id && a.status === ApptStatus.SCHEDULED)
      ? { ...a, datetime: validTime }
      : a
    );
    this.setState({ appointments: appts });
    return true;
  }

  rescheduleByHours(apptId: string, hours: number) {
    this.setState({
      appointments: this.data.appointments.map(a => {
        if (a.id === apptId) {
          const d = new Date(a.datetime);
          d.setHours(d.getHours() + hours);
          return { ...a, datetime: d.toISOString(), status: ApptStatus.SCHEDULED };
        }
        return a;
      })
    });
  }

  manageTask(action: 'CREATE' | 'RESOLVE', patientName: string, title?: string, priority: TaskPriority = TaskPriority.MEDIUM) {
    const patient = this.data.patients.find(p => p.name.toLowerCase().includes(patientName.toLowerCase()));
    if (!patient) return false;
    if (action === 'CREATE') {
      const newTask: FollowUpTask = {
        id: `k-${Date.now()}`,
        patientId: patient.id,
        title: title || 'Care Review',
        priority,
        status: 'PENDING',
        dueDate: new Date().toISOString().split('T')[0]
      };
      this.setState({ tasks: [newTask, ...this.data.tasks] });
    } else {
      const task = this.data.tasks.find(t => t.patientId === patient.id && t.status === 'PENDING');
      if (task) this.setState({ tasks: this.data.tasks.filter(t => t.id !== task.id) });
    }
    return true;
  }

  manageTransport(action: 'REQUEST' | 'CANCEL' | 'ASSIGN', patientName: string, driverName?: string) {
    const patient = this.data.patients.find(p => p.name.toLowerCase().includes(patientName.toLowerCase()));
    if (!patient) return false;
    if (action === 'REQUEST') {
      const existing = this.data.transportRequests.find(r => r.patientId === patient.id && r.status === TransportStatus.REQUESTED);
      if (existing) return true;

      const newRide: TransportRequest = {
        id: `t-${Date.now()}`,
        patientId: patient.id,
        pickupLocation: patient.address,
        destination: 'Beacon Medical Center',
        scheduledTime: new Date().toISOString(),
        status: TransportStatus.REQUESTED
      };
      this.setState({ transportRequests: [newRide, ...this.data.transportRequests] });
      this.addNotification(`NEW PICKUP REQUEST: ${patient.name} needs a ride to Beacon.`);
    } else if (action === 'ASSIGN' && driverName) {
      const driver = this.data.users.find(u => u.name.toLowerCase().includes(driverName.toLowerCase()));
      const ride = this.data.transportRequests.find(r => r.patientId === patient.id && r.status === TransportStatus.REQUESTED);
      if (ride && driver) {
        this.setState({ transportRequests: this.data.transportRequests.map(r => r.id === ride.id ? { ...r, driverId: driver.id, driverName: driver.name, status: TransportStatus.ASSIGNED } : r) });
      }
    } else {
      this.setState({ transportRequests: this.data.transportRequests.filter(r => r.patientId !== patient.id || r.status === TransportStatus.COMPLETED) });
    }
    return true;
  }

  claimRide(rideId: string, driverId: string, driverName: string) {
    this.setState({
      transportRequests: this.data.transportRequests.map(r => 
        r.id === rideId ? { ...r, driverId, driverName, status: TransportStatus.ASSIGNED } : r
      )
    });
    this.addNotification(`Ride ${rideId} claimed by ${driverName} via Beacon Fleet.`);
  }

  requestRide(patientId: string, appointmentId?: string) {
    const patient = this.data.patients.find(p => p.id === patientId);
    if (!patient) return false;
    
    const appt = appointmentId ? this.data.appointments.find(a => a.id === appointmentId) : null;
    
    const newRide: TransportRequest = {
      id: `t-${Date.now()}`,
      patientId: patient.id,
      appointmentId: appt?.id,
      pickupLocation: patient.address,
      destination: appt?.location || 'Beacon Medical Center',
      scheduledTime: appt ? ensureValidDate(new Date(new Date(appt.datetime).getTime() - 45 * 60000)) : new Date().toISOString(),
      status: TransportStatus.REQUESTED
    };
    this.setState({ transportRequests: [newRide, ...this.data.transportRequests] });
    this.addNotification(`Beacon Pickup requested for ${patient.name}.`);
    return true;
  }

  confirmAppt(apptId: string) {
    this.setState({ 
      appointments: this.data.appointments.map(a => a.id === apptId ? { ...a, status: ApptStatus.CONFIRMED } : a) 
    });
  }

  rescheduleOneWeek(apptId: string) {
    const appts = this.data.appointments.map(a => {
      if (a.id === apptId) {
        const nextWeek = new Date(a.datetime);
        nextWeek.setDate(nextWeek.getDate() + 7);
        return { ...a, datetime: ensureValidDate(nextWeek), status: ApptStatus.SCHEDULED };
      }
      return a;
    });
    this.setState({ appointments: appts });
    this.addNotification("Rescheduled via Beacon for one week from original date.");
  }

  requestMedicalHelp(patientId: string) {
    const patient = this.data.patients.find(p => p.id === patientId);
    if (!patient) return;

    const existingSOS = this.data.transportRequests.find(r => r.patientId === patientId && r.isEmergency && r.status !== TransportStatus.COMPLETED);
    if (existingSOS) return;

    this.setTheme('emergency');
    this.addNotification(`EMERGENCY SOS: AMBULANCE DISPATCHED TO ${patient.address.toUpperCase()} FOR ${patient.name.toUpperCase()}.`);

    const emergencyRide: TransportRequest = {
      id: `sos-${Date.now()}`,
      patientId: patient.id,
      pickupLocation: patient.address,
      destination: 'BEACON EMERGENCY ROOM',
      scheduledTime: new Date().toISOString(),
      status: TransportStatus.ASSIGNED,
      driverName: 'AMBULANCE UNIT 01',
      isEmergency: true
    };

    this.setState({ transportRequests: [emergencyRide, ...this.data.transportRequests] });
  }

  resolveEmergency(patientId: string) {
    const sosRide = this.data.transportRequests.find(r => r.patientId === patientId && r.isEmergency && r.status !== TransportStatus.COMPLETED);
    
    this.setTheme('clinical');
    if (sosRide) {
      this.setState({
        transportRequests: this.data.transportRequests.map(r => 
          r.id === sosRide.id ? { ...r, status: TransportStatus.COMPLETED } : r
        )
      });
      this.addNotification(`Emergency situation for subject ${patientId} has been resolved.`);
    }
  }

  callDriver(rideId: string) {
    this.addNotification(`Connecting to Beacon Fleet for ride ${rideId}...`);
  }

  sendMessage(senderId: string, text: string, receiverId: string) {
    const msg: Message = { id: `m-${Date.now()}`, senderId, receiverId, text, timestamp: new Date().toISOString() };
    this.setState({ messages: [...this.data.messages, msg] });
  }

  resolveTask(taskId: string) {
    this.setState({ tasks: this.data.tasks.filter(t => t.id !== taskId) });
  }

  updateTransportStatus(rideId: string, status: TransportStatus) {
    const ride = this.data.transportRequests.find(r => r.id === rideId);
    if (ride?.isEmergency && status === TransportStatus.COMPLETED) {
      this.setTheme('clinical');
    }
    this.setState({ transportRequests: this.data.transportRequests.map(r => r.id === rideId ? { ...r, status } : r) });
  }

  failRide(rideId: string, reason: string) {
    const ride = this.data.transportRequests.find(r => r.id === rideId);
    if (ride?.isEmergency) {
      this.setTheme('clinical');
    }
    this.setState({
      transportRequests: this.data.transportRequests.map(r => 
        r.id === rideId ? { ...r, status: TransportStatus.FAILED } : r
      )
    });
  }
}

export const store = new Store();
