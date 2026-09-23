using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Net.Http.Headers;

namespace digitalmaktabapi.Services.Zoom
{
    public class ZoomService
    {
        private readonly string clientId = "gWwWMh2TRounBBDg3ri7Sg";
        private readonly string clientSecret = "OcmeVw1s5IiKP17b1ne8T8SdByhpfC29";
        private readonly string accountId = "XuVR9K34SHeUVU4Cz2kCXg";

        // Fetch access token from Zoom API
        // public async Task<string> GetAccessTokenAsync()
        // {
        //     var client = new HttpClient();

        //     var authHeader = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}"));
        //     client.DefaultRequestHeaders.Add("Authorization", $"Basic {authHeader}");

        //     var request = new HttpRequestMessage(HttpMethod.Post, "https://zoom.us/oauth/token");
        //     request.Content = new StringContent("grant_type=client_credentials", Encoding.UTF8, "application/x-www-form-urlencoded");

        //     var response = await client.SendAsync(request);
        //     var content = await response.Content.ReadAsStringAsync();

        //     if (response.IsSuccessStatusCode)
        //     {
        //         var tokenResponse = JsonDocument.Parse(content);
        //         return tokenResponse.RootElement.GetProperty("access_token").GetString();
        //     }
        //     else
        //     {
        //         throw new Exception($"Failed to get access token: {content}");
        //     }
        // }

        public async Task<string> GetAccessTokenAsync()
        {
            using var client = new HttpClient();
            var authHeader = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}"));
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", authHeader);

            var request = new HttpRequestMessage(HttpMethod.Post, "https://zoom.us/oauth/token");
            request.Content = new StringContent($"grant_type=account_credentials&account_id={accountId}", Encoding.UTF8, "application/x-www-form-urlencoded");

            var response = await client.SendAsync(request);
            var content = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                var tokenResponse = JsonDocument.Parse(content);
                return tokenResponse.RootElement.GetProperty("access_token").GetString();
            }
            else
            {
                throw new Exception($"Failed to get access token: {content}");
            }
        }

        // Create a meeting
        // Method to create a meeting
        public async Task<string> CreateMeetingAsync(string userId, string topic, int duration)
        {
            var accessToken = await GetAccessTokenAsync();

            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            var meetingDetails = new
            {
                topic = topic,
                type = 2, // Scheduled meeting
                start_time = DateTime.UtcNow.AddHours(1).ToString("yyyy-MM-ddTHH:mm:ssZ"), // Start time in UTC
                duration = duration, // Duration in minutes
                timezone = "UTC",
                agenda = "Meeting agenda",
                settings = new
                {
                    host_video = true,
                    participant_video = true,
                    mute_upon_entry = true,
                    approval_type = 2 // No registration required
                }
            };

            var content = new StringContent(JsonSerializer.Serialize(meetingDetails), Encoding.UTF8, "application/json");

            var response = await client.PostAsync($"https://api.zoom.us/v2/users/{userId}/meetings", content);
            var responseContent = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                return responseContent; // JSON response with meeting details
            }
            else
            {
                throw new Exception($"Failed to create meeting: {responseContent}");
            }
        }
    }
}