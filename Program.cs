
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

            // Add services to the container.

            builder.Services.AddControllers();
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            builder.Services.AddDbContext<AppDbContext>(opt => opt.UseInMemoryDatabase("TrackerDb"));

            var agentsPath = Path.Combine(builder.Environment.ContentRootPath, "data", "agents.json");
            var agents = JsonSerializer.Deserialize<List<Agent>>(File.ReadAllText(agentsPath)) ?? new List<Agent>();

            var app = builder.Build();

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
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
