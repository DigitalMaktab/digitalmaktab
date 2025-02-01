using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace digitalmaktabapi.Services.OnlineClass
{
    public class ClassHub : Hub
    {
        private static readonly Dictionary<string, HashSet<string>> Classes = new();

        public async Task JoinClass(string classId)
        {
            if (string.IsNullOrEmpty(classId))
            {
                throw new HubException("Class ID cannot be null or empty.");
            }

            if (Context.ConnectionId == null)
            {
                throw new HubException("Connection ID is null.");
            }

            lock (Classes)
            {
                if (!Classes.ContainsKey(classId))
                    Classes[classId] = new HashSet<string>();

                Classes[classId].Add(Context.ConnectionId);
            }

            await Groups.AddToGroupAsync(Context.ConnectionId, classId);
            await Clients.Group(classId).SendAsync("UserJoined", Context.ConnectionId);
        }

        public async Task LeaveClass(string classId)
        {
            if (string.IsNullOrEmpty(classId) || Context.ConnectionId == null)
                return;

            lock (Classes)
            {
                if (Classes.ContainsKey(classId))
                {
                    Classes[classId].Remove(Context.ConnectionId);
                }
            }

            await Groups.RemoveFromGroupAsync(Context.ConnectionId, classId);
            await Clients.Group(classId).SendAsync("UserLeft", Context.ConnectionId);
        }

        public async Task SendOffer(string peerId, string offer)
        {
            if (string.IsNullOrEmpty(peerId) || string.IsNullOrEmpty(offer))
                return;

            await Clients.Client(peerId).SendAsync("ReceiveOffer", Context.ConnectionId, offer);
        }

        public async Task SendAnswer(string peerId, string answer)
        {
            if (string.IsNullOrEmpty(peerId) || string.IsNullOrEmpty(answer))
                return;

            await Clients.Client(peerId).SendAsync("ReceiveAnswer", Context.ConnectionId, answer);
        }
    }
}