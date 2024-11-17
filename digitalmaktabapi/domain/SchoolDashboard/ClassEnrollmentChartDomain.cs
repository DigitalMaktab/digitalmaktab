using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Models;

namespace digitalmaktabapi.domain.SchoolDashboard
{
    public class ClassEnrollmentChartDomain
    {
        public ClassName ClassName { get; set; }
        public string BranchName { get; set; } = "";
        public int EnrollmentCount { get; set; }
    }
}