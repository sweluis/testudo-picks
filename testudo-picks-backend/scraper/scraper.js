import axios from 'axios';
import * as cheerio from 'cheerio';

const semesterID = "202608";

export async function getCoursesService(type) {
  const url = `https://app.testudo.umd.edu/soc/gen-ed/${semesterID}/${type}`;
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);

  const courseDivs = $('.course');
  const coursePromises = [];

  courseDivs.each((_, courseDiv) => {
    const courseIdDiv = $(courseDiv).find('.course-id');
    if (!courseIdDiv.length) return;
    const courseId = courseIdDiv.text().trim();
    coursePromises.push(getCourseDetails(courseId));
  });

  const courses = (await Promise.all(coursePromises)).filter(Boolean);

  courses.sort((a, b) => {
    const gpaA = a.average_gpa != null ? a.average_gpa : -1;
    const gpaB = b.average_gpa != null ? b.average_gpa : -1;
    return gpaB - gpaA;
  });

  return courses;
}

async function getCourseDetails(courseId) {
  const classUrl = `https://app.testudo.umd.edu/soc/search?courseId=${courseId}&sectionId=&termId=202508&openSectionsOnly=true&_openSectionsOnly=on&creditCompare=%3E%3D&credits=0.0&courseLevelFilter=ALL&instructor=&_facetoface=on&_blended=on&_online=on&courseStartCompare=&courseStartHour=&courseStartMin=&courseStartAM=&courseEndHour=&courseEndMin=&courseEndAM=&teachingCenter=ALL&_classDay1=on&_classDay2=on&_classDay3=on&_classDay4=on&_classDay5=on`;

  try {
    const [classResponse, gpaResponse] = await Promise.all([
      axios.get(classUrl),
      axios.get(`https://planetterp.com/api/v1/course?name=${courseId}`).catch(() => null)
    ]);

    const classPage = cheerio.load(classResponse.data);
    if (classPage('.no-courses-message').length) return null;

    let restrictionMessage = null;
    let prerequisiteText = null;
    const restrictionOne = classPage('span.footnote-message');
    const restrictionTwo = classPage('strong').filter((_, el) => classPage(el).text().trim() === 'Restriction:');
    const prerequisiteDoc = classPage('strong').filter((_, el) => classPage(el).text().trim() === 'Prerequisite:');
    const courseTitle = classPage('.course-title').first().text().trim();

    if(prerequisiteDoc.length) {
      const parentText = classPage(prerequisiteDoc[0]).parent().text().replace('Prerequisite:', '').trim();
      prerequisiteText = parentText;
    }


    if (restrictionOne.length) {
      restrictionMessage = restrictionOne.text().trim();
    } else if (restrictionTwo.length) {
      const parentText = classPage(restrictionTwo[0]).parent().text().replace('Restriction:', '').trim();
      restrictionMessage = parentText;
    }

    let courseAverageGpa = -1;
    if (gpaResponse && gpaResponse.status === 200 && gpaResponse.data?.average_gpa != null) {
      courseAverageGpa = gpaResponse.data.average_gpa;
    }

    const courseObj = {
      title: courseTitle,
      id: courseId,
      prerequisite: prerequisiteText,
      restrictions: restrictionMessage,
      average_gpa: courseAverageGpa,
      sections: []
    };

    const sectionTypes = ['section delivery-online', 'section delivery-blended', 'section delivery-f2f'];
    for (const classType of sectionTypes) {
      await Promise.all(
        classPage(`div.${classType.replace(/ /g, '.')}`).map(async (_, sectionDiv) => {
          const sectionId = classPage(sectionDiv).find('.section-id').text().trim();
          const teacher = classPage(sectionDiv).find('.section-instructor').text().trim();
          const seatInfo = classPage(sectionDiv).find('.seats-info').text().replace(/\s+/g, ' ').replace(/^\s*\(|\)\s*$/g, '').trim();

          let profAverageRating = null;

          const profResponse = await axios.get(`https://planetterp.com/api/v1/professor?name=${teacher}`).catch(() => null);

          if (profResponse && profResponse.status === 200 && profResponse.data?.average_rating != null) {
              profAverageRating = profResponse.data.average_rating;
          }

          const classSchedule = classPage(sectionDiv).find('.class-days-container');
          const sectionRestriction = classPage(sectionDiv).find('.section-text').text().trim();

          const sectionObj = {
            section_id: sectionId,
            teacher: teacher,
            average_rating: profAverageRating,
            seat_info_span: seatInfo,
            section_restriction: sectionRestriction ? sectionRestriction : null,
            section_times: []
          };

          classSchedule.find('.row').each((_, row) => {
            const days = classPage(row).find('.section-days').text().trim();
            const startTime = classPage(row).find('.class-start-time').text().trim();
            const endTime = classPage(row).find('.class-end-time').text().trim();
            const onElms = classPage(row).find('.elms-class-message').length;
            const contactDept = classPage(row).find('.push_two.eight.columns.class-message').length;

            let timeInfo = {};
            if (onElms) {
              timeInfo = {
                days: null,
                start_time: null,
                end_time: null,
                time_on_elms_message: true,
                contact_department_message: false
              };
            } else if (contactDept) {
              timeInfo = {
                days: null,
                start_time: null,
                end_time: null,
                time_on_elms_message: false,
                contact_department_message: true
              };
            } else if (days && startTime && endTime) {
              timeInfo = {
                days,
                start_time: startTime,
                end_time: endTime,
                time_on_elms_message: false,
                contact_department_message: false
              };
            } else {
              timeInfo = {
                error: "section not found"
              };
            }

            sectionObj.section_times.push(timeInfo);
          });

          courseObj.sections.push(sectionObj);
        }).get()
      );
    }

    return courseObj;
  } catch (err) {
    console.log(`Failed to process ${courseId}`);
    return null;
  }
}
