using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Models
{
    [Table("QuizAttemp")]
    public class QuizAttemp : Base
    {
        public required Guid StudentId { get; set; }
        public required Student Student { get; set; }
        public required Guid QuizId { get; set; }
        public required Quiz Quiz { get; set; }
        public required Guid QuestionBankId { get; set; }
        public required QuestionBank QuestionBank { get; set; }
        public required string Answer { get; set; }
        public required bool IsCorrect { get; set; }
    }
}