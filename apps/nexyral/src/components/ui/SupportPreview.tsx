import { Check, Inbox, MoreHorizontal, Search } from "lucide-react";
export default function SupportPreview() {
  return (
    <div className="support-preview">
      <div className="support-top">
        <strong>
          <span>S</span> SupportOS
        </strong>
        <MoreHorizontal size={15} />
      </div>
      <div className="support-body">
        <div className="support-rail">
          <Inbox size={16} />
          <span />
          <span />
          <span />
        </div>
        <div className="support-content">
          <div className="support-title">
            <h4>Team inbox</h4>
            <span className="support-avatar">AL</span>
          </div>
          <div className="support-search">
            <Search size={12} />
            Search conversations
          </div>
          <div className="support-filters">
            <b>All tickets</b>
            <span>Assigned</span>
            <span>Resolved</span>
          </div>
          {[
            ["MR", "Morgan Reed", "Account access", "Open"],
            ["JK", "Jamie Kim", "Billing question", "In progress"],
            ["AC", "Alex Chen", "Team invitation", "Resolved"],
          ].map(([initial, name, subject, status]) => (
            <div className="ticket" key={name}>
              <span className="ticket-avatar">{initial}</span>
              <div>
                <strong>{subject}</strong>
                <small>{name}</small>
              </div>
              <span
                className={`ticket-status ${status === "Resolved" ? "resolved" : ""}`}
              >
                {status === "Resolved" && <Check size={9} />} {status}
              </span>
            </div>
          ))}
          <div className="support-summary">
            <span>Shared context</span>
            <span>Clear ownership</span>
            <span>Connected teams</span>
          </div>
        </div>
      </div>
    </div>
  );
}
