
using BackOfficeTracker.Data;
using BackOfficeTracker.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace BackOfficeTracker
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // MVC + Swagger
            builder.Services.AddControllers();
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            // InMemory DB (for now)
            builder.Services.AddDbContext<AppDbContext>(opt => opt.UseInMemoryDatabase("TrackerDb"));

            // ---------- Load agents.json ----------
            // 1) allow override via env var (e.g., in Docker compose)
            // 2) default to <contentroot>/data/agents.json
            var envPath = Environment.GetEnvironmentVariable("AGENTS_JSON_PATH");
            var defaultPath = Path.Combine(builder.Environment.ContentRootPath, "data", "agents.json");
            var agentsPath = !string.IsNullOrWhiteSpace(envPath) && File.Exists(envPath)
                ? envPath
                : defaultPath;

            Console.WriteLine($"[Auth] Loading agents from: {agentsPath}");

            if (!File.Exists(agentsPath))
                throw new FileNotFoundException($"agents.json not found at {agentsPath}");

            var json = File.ReadAllText(agentsPath);
            var agents = JsonSerializer.Deserialize<List<Agent>>(json,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                ?? new List<Agent>();

            Console.WriteLine($"[Auth] Loaded {agents.Count} agent(s).");

            // Register the loaded agents list for DI
            builder.Services.AddSingleton(agents); // resolves as List<Agent>

            var app = builder.Build();

            if (app.Environment.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
                app.UseSwagger();
                app.UseSwaggerUI();

                // Dev-only helper to confirm what was loaded
                app.MapGet("/api/auth/debug-agents", (List<Agent> a) =>
                    a.Select(x => new { x.Id, x.Email, x.DisplayName }));
            }

            app.UseDefaultFiles();
            app.UseStaticFiles();

            app.UseHttpsRedirection();
            app.UseAuthorization();

            app.MapControllers();
            app.Run();
        }
    }
}
