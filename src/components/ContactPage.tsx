import * as React from "react";

export function ContactPage() {
  return (
    <div className="contact-page">
      <h1>Contact Us</h1>
      <p className="page-sub">
        We'd love to hear from you. Send us a message and we'll respond within
        one business day.
      </p>

      <div className="contact-layout">
        <aside className="contact-details">
          <h2>Get in touch</h2>

          <div className="detail-item">
            <span className="detail-label">Address</span>
            <span className="detail-value">
              14 Mercer Street
              <br />
              Covent Garden
              <br />
              London, WC2H 9QA
              <br />
              United Kingdom
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Telephone</span>
            <span className="detail-value">
              <a href="tel:+442071234567">+44 (0)20 7123 4567</a>
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Email</span>
            <span className="detail-value">
              <a href="mailto:hello@maisonreserve.com">
                hello@maisonreserve.com
              </a>
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Hours</span>
            <span className="detail-value">
              Monday – Friday: 9:00 – 18:00
              <br />
              Saturday: 10:00 – 16:00
              <br />
              Sunday: Closed
            </span>
          </div>
        </aside>

        <div className="contact-form-card">
          <h2>Send a message</h2>
          <form method="POST" action="/contact">
            <div className="form-group">
              <label htmlFor="name">Your name</label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="Jane Smith"
                autoComplete="name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="jane@example.com"
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                name="message"
                placeholder="How can we help?"
              />
            </div>
            <button type="submit" className="btn-primary">
              Send message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
