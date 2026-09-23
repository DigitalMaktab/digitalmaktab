using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using digitalmaktabapi.Dtos;
using digitalmaktabapi.Models;

namespace digitalmaktabapi.Helpers.Mappers
{
    public class BaseMapper : Profile
    {
        public BaseMapper()
        {
            CreateMap<Base, BaseDto>()
            .ForMember(dest => dest.CreationUserName,
                opt => opt.MapFrom<UserResolver, Guid?>(src => src.CreationUserId))
            .ForMember(dest => dest.UpdateUserName,
                opt => opt.MapFrom<UserResolver, Guid?>(src => src.UpdateUserId));
        }
    }
}