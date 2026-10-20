
import { useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:5000/api";

function App() {
  const [services, setServices] = useState([]);
  const [service, setService] = useState("College Office");
  const [tickets, setTickets] = useState([]);
  const [myToken, setMyToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadData() {
    try {
      const [servicesResponse, ticketsResponse] = await Promise.all([
        fetch(`${API}/services`),
        fetch(`${API}/tickets`)
      ]);

      if (!servicesResponse.ok || !ticketsResponse.ok) {
        throw new Error("Unable to load queue data");
      }

      const servicesData = await servicesResponse.json();
      const ticketsData = await ticketsResponse.json();

      setServices(servicesData);
      setTickets(ticketsData);

      if (
        servicesData.length &&
        !servicesData.some((item) => item.name === service)
      ) {
        setService(servicesData[0].name);
      }

      setError("");
    } catch (err) {
      console.error(err);
      setError("Cannot connect to the backend. Make sure the server is running.");
    }
  }

  useEffect(() => {
    loadData();
    // Initial data load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function getToken() {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceName: service })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not generate token");
      }

      setMyToken(data);
      setNotice(`Your token ${data.token} has been created.`);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function callNext() {
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API}/queue/next`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceName: service })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not call next student");
      }

      setNotice(`Now serving ${data.token}.`);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function completeTicket(ticket) {
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API}/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Completed" })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not complete ticket");
      }

      setNotice(`${ticket.token} has been completed.`);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  const serviceTickets = tickets
    .filter((ticket) => ticket.serviceName === service)
    .sort((a, b) => a.number - b.number);

  const waitingTickets = serviceTickets.filter(
    (ticket) => ticket.status === "Waiting"
  );

  const servingTicket = serviceTickets.find(
    (ticket) => ticket.status === "Serving"
  );

  const completedTickets = serviceTickets.filter(
    (ticket) => ticket.status === "Completed"
  );

  const myPosition = myToken?.serviceName === service &&
    myToken.status === "Waiting"
    ? waitingTickets.findIndex((ticket) => ticket.id === myToken.id) + 1
    : 0;

  return (
    <div className="app">
      <nav className="navbar">
        <a className="logo" href="#home">
          Queue<span>Less</span>
        </a>
        <span className="nav-label">Smart Campus Queue System</span>
      </nav>

      <header className="hero" id="home">
        <p className="eyebrow">YOUR TIME MATTERS</p>
        <h1>Skip the line.<br />Keep your time.</h1>
        <p className="hero-text">
          Take a digital token and track your queue without
          waiting in a physical line.
        </p>
      </header>

      <main className="dashboard">
        {error && <div className="message error">{error}</div>}
        {notice && <div className="message success">{notice}</div>}

        <section className="card booking">
          <h2>Get your token</h2>
          <p>Choose a campus service to join its queue.</p>

          <label htmlFor="service">Select service</label>
          <select
            id="service"
            value={service}
            onChange={(event) => {
              setService(event.target.value);
              setMyToken(null);
              setNotice("");
            }}
          >
            {services.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>

          <button
            className="primary-btn"
            onClick={getToken}
            disabled={loading || services.length === 0}
          >
            {loading ? "Generating..." : "Get My Token →"}
          </button>

          {myToken && myToken.serviceName === service && (
            <div className="token-result">
              <p>Your token number</p>
              <h2>{myToken.token}</h2>
              <p>{myToken.serviceName}</p>
              <span className={`status-badge ${myToken.status.toLowerCase()}`}>
                {myToken.status}
              </span>
              {myPosition > 0 && (
                <p>Your position: {myPosition} in the waiting queue</p>
              )}
            </div>
          )}
        </section>

        <section className="card status-card">
          <div className="section-heading">
            <div>
              <h2>Queue overview</h2>
              <p>Current status for {service}</p>
            </div>
            <button className="refresh-btn" onClick={loadData}>
              Refresh
            </button>
          </div>

          <div className="stats">
            <div className="stat">
              <span>Now serving</span>
              <h2>{servingTicket?.token || "—"}</h2>
            </div>
            <div className="stat">
              <span>People waiting</span>
              <h2>{waitingTickets.length}</h2>
            </div>
            <div className="stat">
              <span>Completed</span>
              <h2>{completedTickets.length}</h2>
            </div>
            <div className="stat">
              <span>Total issued</span>
              <h2>{serviceTickets.length}</h2>
            </div>
          </div>

          <h3>Campus services</h3>

          {services.map((item) => {
            const count = tickets.filter(
              (ticket) =>
                ticket.serviceName === item.name &&
                ticket.status === "Waiting"
            ).length;

            return (
              <button
                type="button"
                className={`service-row ${
                  service === item.name ? "selected-service" : ""
                }`}
                key={item.id}
                onClick={() => {
                  setService(item.name);
                  setMyToken(null);
                  setNotice("");
                }}
              >
                <span>
                  <strong>{item.name}</strong>
                  <small>
                    {count === 0 ? "No one waiting" : `${count} waiting`}
                  </small>
                </span>
                <span className="service-dot">●</span>
              </button>
            );
          })}
        </section>

        <section className="card ticket-history">
          <h2>Ticket history</h2>
          <p>Saved tickets for {service}.</p>

          {serviceTickets.length === 0 ? (
            <p>No tickets yet. Take a token to get started.</p>
          ) : (
            [...serviceTickets].reverse().map((ticket) => (
              <div className="ticket-row" key={ticket.id}>
                <div>
                  <strong>{ticket.token}</strong>
                  <small>
                    {new Date(ticket.createdAt).toLocaleString()}
                  </small>
                </div>
                <span className={`status-badge ${ticket.status.toLowerCase()}`}>
                  {ticket.status}
                </span>
              </div>
            ))
          )}
        </section>

        <section className="card admin-card">
          <div className="section-heading">
            <div>
              <h2>Admin dashboard</h2>
              <p>Staff controls for {service}</p>
            </div>
            <span className="admin-label">STAFF</span>
          </div>

          <div className="current-ticket">
            <span>Currently serving</span>
            <h2>{servingTicket?.token || "No active token"}</h2>
            {servingTicket && <p>{servingTicket.serviceName}</p>}
          </div>

          <button
            className="primary-btn"
            onClick={callNext}
            disabled={Boolean(servingTicket)}
          >
            {servingTicket ? "Complete current ticket first" : "Call Next Student →"}
          </button>

          {servingTicket && (
            <button
              className="complete-btn"
              onClick={() => completeTicket(servingTicket)}
            >
              Mark {servingTicket.token} Completed
            </button>
          )}

          <h3>Waiting queue</h3>

          {waitingTickets.length === 0 ? (
            <p>No students are waiting.</p>
          ) : (
            waitingTickets.map((ticket, index) => (
              <div className="ticket-row" key={ticket.id}>
                <div>
                  <strong>{ticket.token}</strong>
                  <small>Position {index + 1}</small>
                </div>
                <span className="status-badge waiting">Waiting</span>
              </div>
            ))
          )}
        </section>
      </main>

      <footer>
        <p>QueueLess © 2026 · Less waiting, more living.</p>
      </footer>
    </div>
  );
}

export default App;

