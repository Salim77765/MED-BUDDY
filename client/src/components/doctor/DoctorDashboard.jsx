import React from 'react';
import { Link } from 'react-router-dom';

function DoctorDashboard() {
  // Mock data - replace with actual patient data
  const patients = [
    { id: 1, name: 'John Doe', status: 'Active' },
    { id: 2, name: 'Jane Smith', status: 'Need Review' },
  ];

  return (
    <div className="doctor-dashboard">
      <h2>Doctor Dashboard</h2>
      <div className="patient-monitoring">
        <h3>Patient Monitoring</h3>
        <div className="patient-list">
          {patients.map(patient => (
            <div key={patient.id} className="patient-card">
              <h4>{patient.name}</h4>
              <p>Status: {patient.status}</p>
              <Link to={`/doctor/patient/${patient.id}`}>View Details</Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DoctorDashboard;
