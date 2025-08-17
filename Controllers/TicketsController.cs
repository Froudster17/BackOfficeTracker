using BackOfficeTracker.Data;
using BackOfficeTracker.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BackOfficeTracker.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TicketsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly List<Agent> _agentsFromJson; // injected from Program.cs

        public TicketsController(AppDbContext db, List<Agent> agents)
        {
            _db = db;
            _agentsFromJson = agents;
        }

        // ------------------ DTOs ------------------
        public record CreateTicketDto(string TicketNumber, int AgentId, string? Action, string? Description);
        public record UpdateTicketDto(string TicketNumber, string? Action, string? Description);
        public record TicketDto(int Id, string TicketNumber, string? Action, string? Description, DateTime Time);

        // ------------------ Helpers ------------------
        private static DateTime DayStartLocal(string ymd)
        {
            // ymd: "YYYY-MM-DD" local
            var parts = ymd.Split('-');
            var d = new DateTime(int.Parse(parts[0]), int.Parse(parts[1]), int.Parse(parts[2]), 0, 0, 0, DateTimeKind.Local);
            return d;
        }

        private static DateTime DayEndLocal(string ymd) => DayStartLocal(ymd).AddDays(1);

        private async Task<Agent?> EnsureAgentInDbAsync(int agentId)
        {
            // Try DB first
            var dbAgent = await _db.Agents.FindAsync(agentId);
            if (dbAgent != null) return dbAgent;

            // Fall back to agents.json (DI)
            var fromJson = _agentsFromJson.FirstOrDefault(a => a.Id == agentId);
            if (fromJson == null) return null;

            // Insert a minimal copy into DB so FK works
            dbAgent = new Agent
            {
                Id = fromJson.Id,
                Email = fromJson.Email,
                Password = fromJson.Password,
                DisplayName = fromJson.DisplayName
            };
            _db.Agents.Add(dbAgent);
            await _db.SaveChangesAsync();
            return dbAgent;
        }

        private static TicketDto ToDto(Ticket t) =>
            new(t.Id, t.TicketNumber ?? "", t.Action, t.Description, t.Time);

        // ------------------ GET /api/tickets/mine ------------------
        // Returns tickets for an agent on a given local date
        [HttpGet("mine")]
        public async Task<ActionResult<IEnumerable<TicketDto>>> Mine([FromQuery] int agentId, [FromQuery] string date)
        {
            if (agentId <= 0 || string.IsNullOrWhiteSpace(date))
                return BadRequest(new { error = "agentId and date (YYYY-MM-DD) are required." });

            var start = DayStartLocal(date);
            var end = DayEndLocal(date);

            var rows = await _db.Tickets
                .Include(t => t.Agent)
                .Where(t => t.Agent != null
                            && t.Agent.Id == agentId
                            && t.Time >= start
                            && t.Time < end)
                .OrderByDescending(t => t.Time)
                .ToListAsync();

            return Ok(rows.Select(ToDto));
        }

        // ------------------ POST /api/tickets ------------------
        [HttpPost]
        public async Task<ActionResult<TicketDto>> Create([FromBody] CreateTicketDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.TicketNumber))
                return BadRequest(new { error = "TicketNumber is required." });
            if (dto.AgentId <= 0)
                return BadRequest(new { error = "AgentId is required." });

            var agent = await EnsureAgentInDbAsync(dto.AgentId);
            if (agent == null)
                return BadRequest(new { error = $"Agent {dto.AgentId} not found." });

            var ticket = new Ticket
            {
                TicketNumber = dto.TicketNumber.Trim(),
                Agent = agent,
                Action = dto.Action?.Trim(),
                Description = dto.Description?.Trim(),
                Time = DateTime.Now // store local time as you asked
            };

            _db.Tickets.Add(ticket);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = ticket.Id }, ToDto(ticket));
        }

        // ------------------ GET /api/tickets/{id} ------------------
        [HttpGet("{id:int}")]
        public async Task<ActionResult<TicketDto>> GetById(int id)
        {
            var t = await _db.Tickets.Include(x => x.Agent).FirstOrDefaultAsync(x => x.Id == id);
            if (t == null) return NotFound();
            return Ok(ToDto(t));
        }

        // ------------------ PUT /api/tickets/{id} ------------------
        [HttpPut("{id:int}")]
        public async Task<ActionResult> Update(int id, [FromBody] UpdateTicketDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.TicketNumber))
                return BadRequest(new { error = "TicketNumber is required." });

            var t = await _db.Tickets.Include(x => x.Agent).FirstOrDefaultAsync(x => x.Id == id);
            if (t == null) return NotFound();

            t.TicketNumber = dto.TicketNumber.Trim();
            t.Action = dto.Action?.Trim();
            t.Description = dto.Description?.Trim();;

            await _db.SaveChangesAsync();
            return NoContent();
        }

        // ------------------ DELETE /api/tickets/{id} ------------------
        [HttpDelete("{id:int}")]
        public async Task<ActionResult> Delete(int id)
        {
            var t = await _db.Tickets.FindAsync(id);
            if (t == null) return NotFound();
            _db.Tickets.Remove(t);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
