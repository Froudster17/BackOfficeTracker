namespace BackOfficeTracker.Models
{
    public class Agent
    {
        public int Id { get; set; }

        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;

        public string DisplayName { get; set; } = string.Empty;

        public ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
    }
}
