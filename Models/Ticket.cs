namespace BackOfficeTracker.Models
{
    public class Ticket
    {
        public int Id { get; set; }
        public string? TicketNumber { get; set; }
        public Agent? Agent { get; set; }
        public string? Action { get; set; }
        public string? Description { get; set; }
        public int Time { get; set; }
    }
}
