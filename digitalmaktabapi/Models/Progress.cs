using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Models
{
    [Table("Progress")]
    public class Progress : Base
    {
        public required Guid StudentId { get; set; }
        public required Student Student { get; set; }
        public required Guid LearningMaterialId { get; set; }
        public required LearningMaterial LearningMaterial { get; set; }
        public required DateTime Date { get; set; }
        public required double ProgressPercentage { get; set; }
    }
}