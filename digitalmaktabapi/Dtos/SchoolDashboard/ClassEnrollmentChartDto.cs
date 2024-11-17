using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Dtos.SchoolDashboard
{
    public class ClassEnrollmentChartDto
    {
        public string ClassNameAndBranch { get; set; } = "";
        public int EnrollmentCount { get; set; }
    }
}