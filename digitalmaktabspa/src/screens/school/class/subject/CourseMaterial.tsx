import React, { useCallback, useContext, useEffect, useState } from "react";
import VideoPlayer from "../../../../components/player/VideoPlayer";
import AppAccordion from "../../../../components/accordion/AppAccordion";
import { FiCheckSquare } from "react-icons/fi";
import { ImCheckboxUnchecked } from "react-icons/im";
import { AuthContext } from "../../../../helper/auth/AuthProvider";
import { UserRole } from "../../../../models/UserRole";
import AppVerticalSpacer from "../../../../components/spacer/AppVerticalSpacer";
import AppBaseEditor from "../../../../components/AppBaseEditor";
import { CourseSection } from "../../../../models/CourseSection";
import { useFormData } from "../../../../hooks/useFormData";
import { useAppLocalizer } from "../../../../hooks/useAppLocalizer";
import { EditorProps } from "../../properties/EditorProps";
import AppFormSectionContainer from "../../../../components/form/AppFormSectionContainer";
import AppFormInput from "../../../../components/form/AppFormInput";
import { LearningMaterialType } from "../../../../models/LearningMaterialType";
import AppButton from "../../../../components/AppButton";
import AppFormSelect from "../../../../components/form/AppFormSelect";
import AppLearningMaterialTypeSelect from "../../../../components/select/AppLearningMaterialTypeSelect";
import AppDashedLineSpacer from "../../../../components/spacer/AppDashedLineSpacer";
import useTeacherOperations from "../../../../hooks/useTeacherOperations";
import { ResponseResult } from "../../../../dtos/ResultEnum";

const CourseMaterial: React.FC<EditorProps> = ({ id, initialData }) => {
  const { t } = useAppLocalizer();

  const { userRole } = useContext(AuthContext);

  const { addCourseSection, courseSectionList, data } = useTeacherOperations();

  const [selectedMaterial, setSelectedMaterial] = useState<{
    filePath: string;
    contentType?: string;
    thumbnailPath?: string;
    title: string;
  } | null>(null);

  const handleItemClick = (material: any) => {
    setSelectedMaterial({
      filePath: material.filePath,
      contentType: material.learningMaterialType, // Assuming this maps to a valid content type
      thumbnailPath: material.thumbnailPath,
      title: material.title,
    });
  };

  useEffect(() => {
    courseSectionList(1, 1000, { courseId: id });
  }, []);

  // Example data for learning materials
  const [courseSections, setCourseSections] = useState([
    {
      id: "section1",
      title: "Introduction to React",
      description: "Basics of React and its core concepts.",
      learningMaterials: [
        {
          id: "material1",
          title: "React Basics",
          description: "A beginner's guide to React.",
          filePath: "/materials/react-basics.mp4",
          learningMaterialType: "video",
          thumbnailPath: "/demo.png",
          complete: true,
        },
        {
          id: "material2",
          title: "JSX in Depth",
          description: "Understanding JSX in React.",
          filePath: "/materials/jsx.pdf",
          learningMaterialType: "document",
          thumbnailPath: "/demo.png",
          complete: true,
        },
      ],
    },
    {
      id: "section2",
      title: "State Management",
      description: "Managing state in React applications.",
      learningMaterials: [
        {
          id: "material3",
          title: "State and Props",
          description: "A guide to state and props in React.",
          filePath: "/materials/state-and-props.mp4",
          learningMaterialType: "video",
          thumbnailPath: "/demo.png",
          complete: false,
        },
      ],
    },
  ]);

  // const toggleCompleteStatus = (sectionId: string, materialId: string) => {
  //   setCourseSections((prevSections) =>
  //     prevSections.map((section) =>
  //       section.id === sectionId
  //         ? {
  //             ...section,
  //             learningMaterials: section.learningMaterials.map((material) =>
  //               material.id === materialId
  //                 ? { ...material, complete: !material.complete }
  //                 : material
  //             ),
  //           }
  //         : section
  //     )
  //   );
  // };

  const generateAccordionItems = (sections: CourseSection[]) =>
    sections.map((section) => ({
      id: section.id,
      title: section.title,
      description: section.description,
      content: (
        <ul className="d-flex flex-column gap-2 accordions-content">
          {section.learningMaterials!.map((material) => (
            <li key={material.id}>
              <div
                className="d-flex align-items-start gap-2"
                style={{ cursor: "pointer" }}
                onClick={() => handleItemClick(material)}
              >
                <img
                  className="img-fluid rounded"
                  src={material.thumbnailPath}
                  alt={material.title}
                  style={{ width: "50px", height: "50px" }}
                />
                <div>
                  <h6>{material.title}</h6>
                  <p className="text-muted mb-0">{material.description}</p>
                </div>
              </div>
              {/* <div
                className="d-flex align-items-center mt-2"
                onClick={() => toggleCompleteStatus(section.id, material.id)}
                style={{ cursor: "pointer" }}
              >
                {material.complete ? (
                  <FiCheckSquare className="svg-color stroke-secondary me-2" />
                ) : (
                  <ImCheckboxUnchecked className="svg-color stroke-secondary me-2" />
                )}
                <span className="ms-2">
                  {material.complete ? (
                    <span>Completed</span>
                  ) : (
                    <span>Mark as Complete</span>
                  )}
                </span>
              </div> */}
            </li>
          ))}
        </ul>
      ),
    }));

  const initialFormData = {
    courseId: id,
    title: "",
    description: "",
    learningMaterials: [
      {
        title: "",
        description: "",
        filePath: "",
        learningMaterialType: LearningMaterialType.VIDEO,
        creationUserName: "",
        courseSectionId: "",
        id: "",
        creationDate: new Date(),
        thumbnailPath: "",
        updateUserName: "",
        updateDate: new Date(),
        status: false,
      },
    ],
  } as unknown as CourseSection;

  const validationSchemaConfig = {
    title: { label: t("courseChapter.title.label") },
    description: { label: t("courseChapter.description.label") },
    learningMaterials: {
      label: t("learningMaterial.label"),
      nested: {
        title: { label: t("learningMaterial.title.label") },
        description: { label: t("learningMaterial.description.label") },
        file: { label: t("learningMaterial.file.label") },
        learningMaterialType: { label: t("learningMaterial.type.label") },
      },
      isArray: true,
    },
  } as unknown as Record<
    keyof CourseSection,
    { label: string; nested: Record<string, any> }
  >;

  const [formData, updateFormData] = useFormData<CourseSection>(
    initialData,
    initialFormData
  );

  const handleAddMaterial = () => {
    const newMaterial = {
      title: "",
      description: "",
      filePath: "",
      learningMaterialType: LearningMaterialType.VIDEO,
      creationUserName: "",
      courseSectionId: "",
      id: "",
      creationDate: new Date(),
      thumbnailPath: "",
      updateUserName: "",
      updateDate: new Date(),
      status: false,
    };
    updateFormData({
      learningMaterials: [...(formData.learningMaterials || []), newMaterial],
    });
  };

  const handleRemoveMaterial = (index: number) => {
    if (index === 0) {
      return;
    }
    updateFormData({
      learningMaterials: formData.learningMaterials?.filter(
        (_, i) => i !== index
      ),
    });
  };

  const submitData = useCallback(
    async (courseSection: CourseSection) => {
      courseSection.courseId = id!;
      console.log(courseSection);

      const formData = new FormData();
      formData.append("courseId", courseSection.courseId);
      formData.append("title", courseSection.title);
      formData.append("description", courseSection.description);
      courseSection.learningMaterials!.forEach((material, index) => {
        formData.append(`learningMaterials[${index}].title`, material.title);
        formData.append(
          `learningMaterials[${index}].description`,
          material.description
        );
        formData.append(
          `learningMaterials[${index}].learningMaterialType`,
          material.learningMaterialType.toString()
        );
        formData.append(
          `learningMaterials[${index}].file`,
          material.file || ""
        );
        formData.append(
          `learningMaterials[${index}].thumbnail`,
          material.thumbnail || ""
        );
      });

      const result = await addCourseSection(formData);

      if (result.status === ResponseResult.SUCCESS) {
        console.log("Course section added successfully.");
      }
    },
    [id, addCourseSection]
  );

  return (
    <>
      <div className="row">
        <div className="col-md-3">
          {data && data.length > 0 && (
            <AppAccordion
              items={generateAccordionItems(data as CourseSection[])}
            />
          )}
        </div>
        <div className="col-md-9">
          {selectedMaterial ? (
            <VideoPlayer src={selectedMaterial.filePath} />
          ) : (
            <p>Please select a material to view.</p>
          )}
        </div>
      </div>
      {userRole === UserRole.TEACHER && (
        <>
          <AppVerticalSpacer />
          <div className="row">
            <div className="col-md-12">
              <AppBaseEditor<CourseSection>
                initialData={initialData}
                initialFormData={initialFormData}
                validationSchemaConfig={validationSchemaConfig}
                onSubmit={submitData}
                title={() => t("courseChapter.add.label")}
              >
                {(props) => (
                  <AppFormSectionContainer>
                    <div className="row">
                      <div className="col-md-12">
                        <div className="row">
                          <div className="col-md-12">
                            <AppFormInput
                              required={true}
                              name="title"
                              label={t("courseChapter.title.label")}
                              value={props.formData.title}
                            />
                          </div>
                          <div className="col-md-12">
                            <AppFormInput
                              required={true}
                              type="textArea"
                              name="description"
                              label={t("courseChapter.description.label")}
                              value={props.formData.description}
                            />
                          </div>
                        </div>

                        <AppFormSectionContainer
                          title={t("learningMaterial.label")}
                          actions={
                            <AppButton
                              type="button"
                              onButtonClick={handleAddMaterial}
                              label=""
                              icon="plus"
                              className="btn-xs"
                            />
                          }
                        >
                          <div className="row">
                            {formData.learningMaterials!.map(
                              (material, index) => (
                                <div key={index} className="col-md-12">
                                  <div className="row">
                                    <div className="col-md-4">
                                      <AppFormInput
                                        required={true}
                                        name={`learningMaterials[${index}].title`}
                                        label={t(
                                          "learningMaterial.title.label"
                                        )}
                                        value={material.title}
                                      />
                                    </div>
                                    <div className="col-md-4">
                                      <AppFormInput
                                        required={true}
                                        type="file"
                                        name={`learningMaterials[${index}].file`}
                                        label={t("learningMaterial.file.label")}
                                        value={material.filePath}
                                      />
                                    </div>
                                    <div
                                      className={
                                        index === 0 ? "col-md-4" : "col-md-3"
                                      }
                                    >
                                      <AppFormSelect
                                        name={`learningMaterials[${index}].learningMaterialType`}
                                        label=""
                                        value={
                                          material.learningMaterialTypeValue!
                                        }
                                        required
                                      >
                                        <AppLearningMaterialTypeSelect
                                          name={`learningMaterials[${index}].learningMaterialType`}
                                          value={
                                            material.learningMaterialTypeValue!
                                          }
                                          onChange={() => {}}
                                          required
                                        />
                                      </AppFormSelect>
                                    </div>
                                    <div
                                      className="col-md-1"
                                      style={{
                                        display: "flex",
                                        justifyContent: "flex-end",
                                      }}
                                    >
                                      {index > 0 && (
                                        <AppButton
                                          type="button"
                                          className="btn-xs btn-danger"
                                          onButtonClick={() =>
                                            handleRemoveMaterial(index)
                                          }
                                          label={""}
                                          style={{
                                            height: "30px",
                                          }}
                                          icon="minus"
                                        />
                                      )}
                                    </div>
                                  </div>

                                  <AppFormInput
                                    name={`learningMaterials[${index}].description`}
                                    label={t(
                                      "learningMaterial.description.label"
                                    )}
                                    type="textArea"
                                    value={material.description}
                                    required
                                  />
                                  {index <
                                    formData.learningMaterials!.length - 1 && (
                                    <AppDashedLineSpacer />
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </AppFormSectionContainer>
                      </div>
                    </div>
                  </AppFormSectionContainer>
                )}
              </AppBaseEditor>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default CourseMaterial;
