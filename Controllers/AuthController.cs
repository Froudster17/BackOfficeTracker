using BackOfficeTracker.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BackOfficeTracker.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {

        private readonly List<Agent> agents;

        public AuthController(List<Agent> agents)
        {
            this.agents = agents;
        }

        public record LoginRequest(String Email, string Password);
        public record LoginResponse(String Email, string Password);

        [HttpPost("login")]
        public ActionResult<LoginResponse> Login([FromBody] LoginRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
                return BadRequest(new { error = "Email and password are required." });

            var agent = agents.FirstOrDefault(u =>
                string.Equals(u.Email, req.Email, StringComparison.OrdinalIgnoreCase) &&
                u.Password == req.Password);

            if (agent == null)
                return Unauthorized(new { error = "Invalid email or password." });

            // Success
            return Ok(new LoginResponse(agent.Id.ToString(), agent.Email));
        }
    }
}
