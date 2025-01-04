using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestSharp;

namespace digitalmaktabapi.Controllers
{
    [ApiController]
    [Route("api/zoom")]
    public class ZoomController : ControllerBase
    {
        [HttpGet("login")]
        public IActionResult Login()
        {
            return Challenge(new AuthenticationProperties { RedirectUri = "/" }, "Zoom");
        }

        [HttpGet("create-meeting")]
        [Authorize]
        public async Task<IActionResult> CreateMeeting([FromQuery] string topic, [FromQuery] int duration)
        {
            var token = await HttpContext.GetTokenAsync("access_token");
            var client = new RestClient("https://api.zoom.us/v2/users/me/meetings");
            var request = new RestRequest("https://api.zoom.us/v2/users/me/meetings", Method.Post);

            request.AddHeader("Authorization", $"Bearer {token}");
            request.AddHeader("Content-Type", "application/json");

            var body = new
            {
                topic,
                type = 2, // Scheduled meeting
                duration,
                settings = new { host_video = true, participant_video = true }
            };
            request.AddJsonBody(body);

            var response = await client.ExecuteAsync(request);
            if (response.IsSuccessful)
            {
                return Ok(response.Content);
            }

            return BadRequest(new { error = response.Content });
        }
    }
}