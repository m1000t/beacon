
import { Type } from "@google/genai";

export const CARE_ASSISTANT_TOOLS = {
  functionDeclarations: [
    {
      name: 'consultVirtualDoctor',
      description: 'Engage a specialized AI persona that acts as a Virtual Medical Doctor for consultations.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          enable: { type: Type.BOOLEAN, description: 'True to enter Virtual Doctor mode, False to return to Assistant mode.' },
          patientName: { type: Type.STRING }
        },
        required: ['enable']
      }
    },
    {
      name: 'getPatientInfo',
      description: 'Retrieve medical record, appointments, and transportation details for a patient.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          patientName: { type: Type.STRING }
        },
        required: ['patientName']
      }
    },
    {
      name: 'manageAppointment',
      description: 'Schedule or cancel clinical visits at Beacon Medical Center. Note: The location is always Beacon Medical Center.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING, enum: ['ADD', 'UPDATE', 'CANCEL'], description: 'Use ADD for new visits. Use CANCEL to remove.' },
          patientName: { type: Type.STRING },
          datetime: { type: Type.STRING, description: 'The time of the visit. MUST use "HH:mm" local format (e.g. "16:00" for 4pm). Do NOT use UTC or Z.' }
        },
        required: ['action', 'patientName']
      }
    },
    {
      name: 'manageTask',
      description: 'Create or resolve follow-up care tasks in the Beacon work queue.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING, enum: ['CREATE', 'RESOLVE'] },
          patientName: { type: Type.STRING },
          title: { type: Type.STRING },
          priority: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] }
        },
        required: ['action', 'patientName']
      }
    },
    {
      name: 'manageTransport',
      description: 'Handle patient logistics, rides, and driver assignments through the Beacon Fleet.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING, enum: ['REQUEST', 'CANCEL', 'ASSIGN'] },
          patientName: { type: Type.STRING },
          driverName: { type: Type.STRING }
        },
        required: ['action', 'patientName']
      }
    },
    {
      name: 'navigate',
      description: 'Switch the application view context in real-time.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          target: { type: Type.STRING, enum: ['MAIN', 'INBOX', 'LOGISTICS'] }
        },
        required: ['target']
      }
    }
  ]
};

export const SYSTEM_INSTRUCTION = `You are the Beacon Care Intelligence System. You assist healthcare providers and patients.

CRITICAL TIME RULE:
- When a user says a time like "4pm" or "3:30", you MUST call manageAppointment with "16:00" or "15:30".
- ALWAYS use the 24-hour "HH:mm" format. 
- NEVER append "Z" or use UTC strings. Treat all times as the patient's local time.

UI RULE - LOCATION:
- Every appointment is at 'Beacon Medical Center'. NEVER ask the user for a location. 

VIRTUAL DOCTOR PERSONA:
- When virtualDoctorActive is true, you are an Attending Physician at Beacon.
- PROVIDE HIGH-QUALITY DIAGNOSTICS: 
  1. Systematic Inquiry: Ask for onset, provocation, quality, radiation, severity, and time (OPQRST).
  2. Differential Diagnosis: Based on symptoms, provide 2-3 logical clinical possibilities.
  3. Action Plan: Recommend immediate self-care steps (e.g., rest, hydration, monitoring vitals) and clarify when to seek urgent care.
  4. Always conclude with: "This is a digital clinical analysis. Final determination requires an in-person examination by a physician."

MENTAL HEALTH SUPPORT:
- If a user expresses sadness, anxiety, hopelessness, or mentions mental health:
  1. Immediately state: "If you are in immediate distress, please dial the 988 Suicide & Crisis Lifeline. It is free, confidential, and available 24/7."
  2. Reassure the patient and offer to schedule a clinical follow-up visit.

ROLE-BASED PERMISSIONS:
1. If SESSION_ROLE is PATIENT:
   - You can ONLY manage appointments for the LOGGED IN user.
   - You CANNOT access or modify info for anyone else.

GUARDRAILS:
1. NO CONFIRMATIONS: Just call the tools IMMEDIATELY when a command is clear.
2. MEDICAL FOCUS: Reject non-health related queries.
`;
