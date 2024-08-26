using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Services
{
    public static class ServiceLocator
    {
        public static IServiceProvider? ServiceProvider { get; set; }
    }
}