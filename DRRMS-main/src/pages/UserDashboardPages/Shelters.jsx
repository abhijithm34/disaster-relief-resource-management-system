import React, { useEffect, useState } from 'react';
import { API_URL, apiFetch } from '../../config/api';
import '../../styles/shelters.css';
const VolunteerDashboard = () => {
  const [shelters, setShelters] = useState([]);
const [searchLocation, setSearchLocation] = useState('');
const [error, setError] = useState(null);


  // Fetch the userId from localStorage
  const userId = JSON.parse(localStorage.getItem('user'))?.id; // Assumes 'user' object is stored with 'id'

  // Fetch shelter data
  const fetchData = async () => {
    if (!userId) {
      setError('User ID not found. Please log in again.');
      return;
    }

    try {
      const sheltersRes = await apiFetch(`${API_URL}/shelters`);
      const sheltersData = await sheltersRes.json();
      setShelters(sheltersData);
    } catch (error) {
      console.error('Error fetching shelters data:', error);
      setError('Error fetching shelters data.');
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  // Handle filtering with empty or missing location fields
  const filteredShelters = shelters.filter((r) =>
    r.Location.toLowerCase().includes(searchLocation.toLowerCase())
  );


  

  return (
    <div className="volunteer-dashboard">
      <h2 className="section-title">🏚️ Available Shelters</h2>

      {error && <div className="error-message">{error}</div>}
     
      
      <input
        type="text"
        className="location-search"
        placeholder="Search by location..."
        value={searchLocation}
        onChange={(e) => setSearchLocation(e.target.value)}
      />

      <div className="shelter-flex-container">
        {filteredShelters.length > 0 ? (
          filteredShelters.map((shelter) => (
            
            <div className="card shelter-card" key={shelter.id}> 
              <p><b>Name:</b> {shelter.name}</p>
              <p><b>Capacity:</b> {shelter.capacity}</p>
              <p><b>Current Occupancy:</b> {shelter.current_occupancy}</p>
              <p><b>Contact:</b> {shelter.contact_number}</p>
              <p><b>Location:</b> {shelter.Location}</p>
            </div>
          ))
        ) : (
          <p className="no-shelters-message">{console.log(filteredShelters)}</p>
        )}
      </div>
    </div>
  );
};

export default VolunteerDashboard;
