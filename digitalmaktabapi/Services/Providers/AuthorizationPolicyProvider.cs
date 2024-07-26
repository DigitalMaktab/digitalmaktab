using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;

namespace digitalmaktabapi.Services.Providers
{
    public class AuthorizationPolicyProvider(IOptions<AuthorizationOptions> options, IConfiguration configuration) : DefaultAuthorizationPolicyProvider(options)
    {
        private readonly AuthorizationOptions options = options.Value;
        private readonly IConfiguration configuration = configuration;


        public override async Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
        {
            if (this.options.GetPolicy(policyName) == null)
            {
                var role = this.configuration[$"AuthorizationPolicies:{policyName}"];
                if (!string.IsNullOrEmpty(role))
                {
                    var policy = new AuthorizationPolicyBuilder()
                        .RequireRole(role)
                        .Build();

                    this.options.AddPolicy(policyName, policy);
                }
            }

            return await base.GetPolicyAsync(policyName);
        }
    }
}