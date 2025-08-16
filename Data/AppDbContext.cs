using BackOfficeTracker.Models;
using Microsoft.EntityFrameworkCore;

namespace BackOfficeTracker.Data
{
    public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
    {
        public DbSet<Ticket> Tickets => Set<Ticket>();
        public DbSet<Agent> Agents => Set<Agent>();
    }
}
