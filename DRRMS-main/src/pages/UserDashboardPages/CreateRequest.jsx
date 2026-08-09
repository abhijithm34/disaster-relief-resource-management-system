import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL, apiFetch } from '../../config/api';
import '../../styles/RequestForm.css'; // Link to the CSS below

const RequestForm = () => {
  const [resource, setResource] = useState('');
  const [location, setLocation] = useState('');
  const [quantity, setQuantity] = useState('');
  const [remarks, setRemarks] = useState('');
  const [resourcesList, setResourcesList] = useState([]);
  const [locationsList, setLocationsList] = useState([]);
  const navigate = useNavigate();

  // Fetch available resources and locations when the component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch resources and locations from the backend
        const resourceResponse = await apiFetch(`${API_URL}/resources`);
        const locationResponse = await apiFetch(`${API_URL}/locations`);

        if (resourceResponse.ok && locationResponse.ok) {
          const resourcesData = await resourceResponse.json();
          const locationsData = await locationResponse.json();

          setResourcesList(resourcesData);
          setLocationsList(locationsData);
        } else {
          throw new Error('Error fetching data');
        }
      } catch (error) {
        console.error('Error fetching resources or locations:', error);
        window.alert('Error fetching resources or locations.');
      }
    };

    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'resource') setResource(value); // Store resource_id
    if (name === 'location') setLocation(value); // Store location_id
    if (name === 'quantity') setQuantity(value);
    if (name === 'remarks') setRemarks(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const user = JSON.parse(localStorage.getItem('user'));
    const userId = user ? user.id : null;  // Assuming 'id' is the key for the user ID

    if (!userId) {
      window.alert('User is not logged in.');
      return;
    }

    const requestData = {
      user_id: userId,  // Use the logged-in user's ID
      resource_id: resource, // Send the selected resource ID
      location_id: location, // Send the selected location ID
      quantity_requested: quantity,
      remarks: remarks,
    };

    try {
      const response = await apiFetch(`${API_URL}/user/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        window.alert('Request submitted successfully!');
        navigate('/citizen');
      } else {
        window.alert('Error submitting the request. Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
      window.alert('Error submitting the request. Please try again.');
    }
  };

  return (
    <div className="register-container">
      <h2>Submit a Request</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="resource">Resource:</label>
          <select
            name="resource"
            value={resource}
            onChange={handleChange}
            required
          >
            <option value="">Select Resource</option>
            {resourcesList.map((resource) => (
              <option key={resource.id} value={resource.id}>
                {resource.name} {/* Assuming each resource has 'id' and 'name' */}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="location">Location:</label>
          <select
            name="location"
            value={location}
            onChange={handleChange}
            required
          >
            <option value="">Select Location</option>
            {locationsList.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name} {/* Assuming each location has 'id' and 'name' */}
              </option>
            ))}
          </select>
        </div>

        <div>
          <input
            type="number"
            name="quantity"
            placeholder="Enter Quantity"
            value={quantity}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <textarea
            name="remarks"
            placeholder="Enter Remarks"
            value={remarks}
            onChange={handleChange}
            required
            className="textarea-box"
          />
        </div>

        <button type="submit">Submit Request</button>
      </form>
    </div>
  );
};

export default RequestForm;
