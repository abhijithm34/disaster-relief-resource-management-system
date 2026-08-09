import React from 'react';
import '../styles/user.css';
import { FaHandsHelping, FaListAlt, FaHome, FaBullhorn, FaComments, FaUserCog } from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import { logout } from '../config/api';

const AffectedDashboard = () => {
  // Get userId from the URL params
  const { userId } = useParams();
  const navigate = useNavigate();

  const sections = [
    {
      icon: <FaHandsHelping />,
      title: 'Create Request',
      description: 'Request food, medical aid, rescue, and more.',
      path: '/create-request'
    },
    {
      icon: <FaListAlt />,
      title: 'My Requests',
      description: 'Track the status of your submitted requests.',
      path: '/my-requests'
    },
    {
      icon: <FaHome />,
      title: 'Find Resources',
      description: 'Locate nearby safe shelters with availability.',
      path: '/find-resources'
    },
    {
      icon: <FaBullhorn />,
      title: 'Find Shelters',
      description: 'Locate nearby safe shelters with availability.',
      path: '/shelters'
    },
    {
      icon: <FaUserCog />,
      title: 'Profile Settings',
      description: 'Update your personal information and preferences.',
      path: `/profiles`
    }
    
   
  ];

  return (
    <div className="dashboard-container">
      <button className="logout-btn" onClick={async () => { await logout(); navigate('/'); }}>Logout</button>
      <h1 className="dashboard-title">Disaster Relief Dashboard</h1>
      <div className="dashboard-grid">
        {sections.map((section, index) => (
          <div
            key={index}
            className="dashboard-card"
            onClick={() => navigate(section.path)}
          >
            <div className="dashboard-icon">{section.icon}</div>
            <h3>{section.title}</h3>
            <p className="dashboard-description">{section.description}</p>
            <button className="dashboard-button">Go</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AffectedDashboard;
