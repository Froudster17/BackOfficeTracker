using BackOfficeTracker.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BackOfficeTracker.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly List<Agent> _agents;
        public AuthController(List<Agent> agents) => _agents = agents;

        public record LoginRequest(string Email, string Password);
        public record LoginResponse(int UserId, string Email, string DisplayName);

        [HttpPost("login")]
        public ActionResult<LoginResponse> Login([FromBody] LoginRequest req)
        {
            var email = (req.Email ?? "").Trim();
            var pass = (req.Password ?? "").Trim();
            if (email.Length == 0 || pass.Length == 0)
                return BadRequest(new { error = "Email and password are required." });

            var a = _agents.FirstOrDefault(x =>
                x.Email.Equals(email, StringComparison.OrdinalIgnoreCase) &&
                x.Password == pass);

            if (a is null) return Unauthorized(new { error = "Invalid email or password." });

            return Ok(new LoginResponse(a.Id, a.Email, a.DisplayName ?? a.Email));
        }
    }
}
