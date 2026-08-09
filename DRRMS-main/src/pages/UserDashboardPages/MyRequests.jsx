import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL, apiFetch } from '../../config/api';
import '../../styles/MyRequests.css';

const UserRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    const userId = user?.id;

    if (!userId) {
      setError("User ID not found. Please log in again.");
      setLoading(false);
      return;
    }

    const fetchRequests = async () => {
      try {
        const response = await apiFetch(`${API_URL}/my-requests`);
        if (!response.ok) {
          throw new Error('Error fetching requests');
        }
        const data = await response.json();
        setRequests(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const handleBack = () => {
  

      navigate('/citizen'); // fallback
    
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="register-container">
      <button className="back-button" onClick={handleBack}>← Back to Dashboard</button>

      <h2>Your Requests</h2>
      <div className="request-list">
        {requests.length > 0 ? (
          requests.map((request) => (
            <div key={request.id} className="request-item">
              <div><strong>Resource:</strong> {request.resource}</div>
              <div><strong>Location:</strong> {request.location}</div>
              <div><strong>Quantity:</strong> {request.quantity_requested}</div>
              <div><strong>Status:</strong> {request.status}</div>
              <div><strong>Remarks:</strong> {request.remarks}</div>
            </div>
          ))
        ) : (
          <div>You have no requests yet.</div>
        )}
      </div>
    </div>
  );
};

export default UserRequests;
