import React from 'react';
import { Link } from 'react-router-dom';

function PatientList() {
  // Mock patient data - replace with actual data from your backend
  const patients = [
    { id: 1, name: 'John Doe', age: 35, condition: 'Diabetes' },
    { id: 2, name: 'Jane Smith', age: 28, condition: 'Hypertension' },
  ];

  return (
    <div className="patient-list-container">
      <h2>My Health Records</h2>
      <div className="patient-cards">
        {patients.map(patient => (
          <div key={patient.id} className="patient-card">
            <h3>{patient.name}</h3>
            <p>Age: {patient.age}</p>
            <p>Condition: {patient.condition}</p>
            <Link to={`/patients/${patient.id}`}>View Details</Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PatientList;
