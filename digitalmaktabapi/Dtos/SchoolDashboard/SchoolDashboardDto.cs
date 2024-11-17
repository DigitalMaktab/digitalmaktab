using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Dtos.SchoolDashboard;

namespace digitalmaktabapi.Dtos.SchoolDashboard
{
    public class SchoolDashboardDto
    {
        public int TotalStudents { get; set; }
        public int TotalTeachers { get; set; }
        public int TotalClasses { get; set; }
        public int TotalBranches { get; set; }

        public GenderChartDto GenderChart { get; set; } = new GenderChartDto();
        public GenderChartDto TeachersGenderChart { get; set; } = new GenderChartDto();
        public ICollection<ClassEnrollmentChartDto>? ClassEnrollmentChart { get; set; }
    }
}