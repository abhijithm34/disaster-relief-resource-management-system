import React, { useEffect, useState } from 'react';
import { API_URL, apiFetch, logout } from '../config/api';
import { useNavigate } from 'react-router-dom';
import '../styles/VolunteerDashboard.css';

const VolunteerDashboard = () => {
  const navigate = useNavigate();
  const [allRequests, setAllRequests] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [resources, setResources] = useState([]);

  const [searchLocation, setSearchLocation] = useState('');
  const [searchResource, setSearchResource] = useState('');
  const [selectedType, setSelectedType] = useState('');

  const [activeTab, setActiveTab] = useState('allRequests');
  const [isLoading, setIsLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem('user'));
  const volunteerId = user?.id;

  const fetchData = async () => {
    setIsLoading(true);

    try {
      const endpoints = {
        allRequests: `${API_URL}/volunteers/all-requests`,
        myTasks: `${API_URL}/volunteers/my-tasks?volunteer_id=${volunteerId}`
      };

      const [activeResponse, resourcesResponse] = await Promise.all([
        apiFetch(endpoints[activeTab]),
        apiFetch(`${API_URL}/volunteers/resources`)
      ]);

      const activeData = await activeResponse.json();
      const resourcesData = await resourcesResponse.json();

      if (activeTab === 'allRequests') {
        setAllRequests(Array.isArray(activeData) ? activeData : []);
      } else {
        setMyTasks(Array.isArray(activeData) ? activeData : []);
      }

      setResources(Array.isArray(resourcesData) ? resourcesData : []);

    } catch (error) {
      setAllRequests([]);
      setMyTasks([]);
      setResources([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleAssign = async (requestId) => {
    try {
      const response = await apiFetch(
        `${API_URL}/volunteers/assign-task`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            volunteer_id: volunteerId,
            request_id: requestId
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign task');
      }

      alert('Task assigned successfully!');
      await fetchData();

    } catch (error) {
      alert(error.message);
    }
  };

  const handleCompleteTask = async (requestId) => {
    if (
      !window.confirm(
        'Are you sure you want to mark this task as completed?'
      )
    ) {
      return;
    }

    try {
      const response = await apiFetch(
        `${API_URL}/volunteers/complete-task`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            request_id: requestId,
            volunteer_id: volunteerId
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to complete task'
        );
      }

      alert(
        'Task marked as completed! Waiting for admin verification.'
      );

      await fetchData();

    } catch (error) {
      alert(error.message);
    }
  };

  const filteredResources = resources.filter((resource) => {
    const location = resource.location || '';
    const name = resource.name || '';
    const type = resource.type || '';

    const matchesLocation = location
      .toLowerCase()
      .includes(searchLocation.toLowerCase());

    const matchesResource = name
      .toLowerCase()
      .includes(searchResource.toLowerCase());

    const matchesType =
      !selectedType ||
      type.toLowerCase() === selectedType.toLowerCase();

    return (
      matchesLocation &&
      matchesResource &&
      matchesType
    );
  });

  const currentRequests =
    activeTab === 'allRequests'
      ? allRequests
      : myTasks;

  return (
    <div className="volunteer-dashboard">

      <button className="logout-btn" onClick={async () => { await logout(); navigate('/'); }}>Logout</button>

      <div className="request-management">

        <div className="section-header">
          <h2 className="section-title">
            🆘 Help Requests
          </h2>

          <div className="tab-buttons">

            <button
              className={
                activeTab === 'allRequests'
                  ? 'active'
                  : ''
              }
              onClick={() => setActiveTab('allRequests')}
            >
              All Requests
            </button>

            <button
              className={
                activeTab === 'myTasks'
                  ? 'active'
                  : ''
              }
              onClick={() => setActiveTab('myTasks')}
            >
              My Tasks ({myTasks.length})
            </button>

          </div>
        </div>

        {isLoading ? (
          <div className="loading-spinner">
            Loading...
          </div>
        ) : currentRequests.length === 0 ? (
          <p className="no-requests-message">
            {activeTab === 'allRequests'
              ? 'No pending requests available'
              : 'You have no assigned tasks'}
          </p>
        ) : (
          <div className="card-grid">

            {currentRequests.map((request) => (
              <div
                className="card"
                key={request.request_id}
              >

                <div className="card-header">

                  <span
                    className={`status-badge status-${request.status}`}
                  >
                    {request.status}
                  </span>

                  <span className="request-time">
                    {request.request_time
                      ? new Date(
                          request.request_time
                        ).toLocaleString()
                      : ''}
                  </span>

                </div>

                <p>
                  <b>Citizen:</b> {request.citizen}
                </p>

                <p>
                  <b>Location:</b> {request.location}
                </p>

                <p>
                  <b>Resource:</b> {request.resource}{' '}
                  ({request.quantity_requested})
                </p>

                <p>
                  <b>Remarks:</b> {request.remarks}
                </p>

                <div className="card-buttons">

                  {activeTab === 'allRequests' &&
                    request.status === 'pending' && (
                      <button
                        onClick={() =>
                          handleAssign(
                            request.request_id
                          )
                        }
                      >
                        Assign to Me
                      </button>
                    )}

                  {activeTab === 'myTasks' &&
                    request.status === 'assigned' && (
                      <button
                        className="complete-btn"
                        onClick={() =>
                          handleCompleteTask(
                            request.request_id
                          )
                        }
                      >
                        Mark as Completed
                      </button>
                    )}

                </div>

              </div>
            ))}

          </div>
        )}

      </div>

      <div className="resource-management">

        <h2 className="section-title">
          📦 Available Resources
        </h2>

        <div className="search-filters">

          <input
            type="text"
            className="location-search"
            placeholder="Search by location..."
            value={searchLocation}
            onChange={(e) =>
              setSearchLocation(e.target.value)
            }
          />

          <input
            type="text"
            className="resource-search"
            placeholder="Search by resource..."
            value={searchResource}
            onChange={(e) =>
              setSearchResource(e.target.value)
            }
          />

          <select
            className="resource-filter"
            value={selectedType}
            onChange={(e) =>
              setSelectedType(e.target.value)
            }
          >
            <option value="">All Types</option>
            <option value="food">Food</option>
            <option value="water">Water</option>
            <option value="medical">Medical</option>
            <option value="clothing">Clothing</option>
            <option value="other">Other</option>
          </select>

        </div>

        <div className="resource-flex-container">

          {filteredResources.length === 0 ? (

            <p className="no-resources-message">
              ❌ No resources found matching your criteria
            </p>

          ) : (

            filteredResources.map((resource) => (
              <div
                className="card resource-card"
                key={resource.id}
              >

                <div className="resource-header">

                  <span
                    className={`resource-type type-${resource.type}`}
                  >
                    {resource.type}
                  </span>

                  <span className="resource-updated">
                    {resource.last_updated
                      ? `Updated: ${new Date(
                          resource.last_updated
                        ).toLocaleDateString()}`
                      : ''}
                  </span>

                </div>

                <p>
                  <b>Name:</b> {resource.name}
                </p>

                <p>
                  <b>Qty:</b> {resource.quantity}{' '}
                  {resource.unit}
                </p>

                <p>
                  <b>Location:</b> {resource.location}
                </p>

              </div>
            ))

          )}

        </div>

      </div>

    </div>
  );
};

export default VolunteerDashboard;
