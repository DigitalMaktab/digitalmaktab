using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using digitalmaktabapi.Data;
using digitalmaktabapi.Dtos;
using digitalmaktabapi.Models;
using Microsoft.EntityFrameworkCore;

namespace digitalmaktabapi.Helpers.Mappers
{
    public class UserResolver : IMemberValueResolver<Base, BaseDto, Guid?, string>
    {
        private readonly DataContext dataContext;
        private readonly Dictionary<Type, Func<Guid, string>> entityResolvers;

        public UserResolver(DataContext dataContext)
        {
            this.dataContext = dataContext;

            // Initialize the dictionary with resolvers for each type
            this.entityResolvers = new Dictionary<Type, Func<Guid, string>>
            {
                { typeof(User), ResolveUser },
                { typeof(School), ResolveSchool },
                { typeof(Teacher), ResolveTeacher },
                { typeof(Student), ResolveStudent }
            };
        }

        public string Resolve(Base source, BaseDto destination, Guid? userId, string destMember, ResolutionContext context)
        {
            if (!userId.HasValue) return string.Empty;
            foreach (var resolver in this.entityResolvers)
            {
                var result = resolver.Value.Invoke(userId.Value);
                if (!string.IsNullOrEmpty(result))
                {
                    return result;
                }
            }
            return string.Empty; // Fallback if no entity was found
        }

        private string ResolveUser(Guid userId)
        {
            var user = this.dataContext.Users.FirstOrDefault(x => x.Id == userId);
            return user != null ? $"{user.FirstName} {user.LastName}" : string.Empty;
        }

        private string ResolveSchool(Guid userId)
        {
            var school = this.dataContext.Schools.FirstOrDefault(x => x.Id == userId);
            return school != null ? school.SchoolName : string.Empty;
        }

        private string ResolveTeacher(Guid userId)
        {
            var teacher = this.dataContext.Teachers.FirstOrDefault(x => x.Id == userId);
            return teacher != null ? $"{teacher.FirstName} {teacher.LastName}" : string.Empty;
        }

        private string ResolveStudent(Guid userId)
        {
            var student = this.dataContext.Students.FirstOrDefault(x => x.Id == userId);
            return student != null ? $"{student.FirstNameNative} {student.LastNameNative}" : string.Empty;
        }
    }
}