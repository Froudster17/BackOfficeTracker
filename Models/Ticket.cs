using System;

namespace BackOfficeTracker.Models
{
    public class Ticket
    {
        public int Id { get; set; }
        public string TicketNumber { get; set; } = string.Empty;
        public Agent? Agent { get; set; }
        public string Action { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime Time { get; set; } = DateTime.UtcNow;
    }
}
