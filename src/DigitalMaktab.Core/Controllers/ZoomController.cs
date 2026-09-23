using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using digitalmaktabapi.Services.Zoom;
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
        private readonly string redirectUri = "https://www.digitalmaktab.com/";
        private readonly ZoomService _zoomService;
        public ZoomController()
        {
            _zoomService = new ZoomService(); // Dependency injection can be used here for better scalability
        }

        [HttpGet("login")]
        public IActionResult Login()
        {
            return Challenge(new AuthenticationProperties { RedirectUri = "/" }, "Zoom");
        }

        // Endpoint to create a meeting
        [HttpPost("create-meeting")]
        public async Task<IActionResult> CreateMeeting([FromBody] CreateMeetingRequest request)
        {
            try
            {
                var response = await _zoomService.CreateMeetingAsync(request.UserId, request.Topic, request.Duration);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }




        // [HttpGet("auth")]
        // public IActionResult Authenticate()
        // {
        //     var authUrl = $"https://zoom.us/oauth/authorize?response_type=code&client_id={clientId}&redirect_uri={redirectUri}";
        //     return Redirect(authUrl);
        // }

        [HttpGet("create-meet")]
        [Authorize]
        public async Task<IActionResult> CreateMeet([FromQuery] string topic, [FromQuery] int duration)
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

    // Request model for meeting creation
    public class CreateMeetingRequest
    {
        public string UserId { get; set; } // Email or "me" for the current user
        public string Topic { get; set; }
        public int Duration { get; set; } // Duration in minutes
    }
}