document.getElementById("course_type").addEventListener("change", async function () {
  const type = this.value;

  const container = document.getElementById("course-results");

  container.innerHTML = "";

  document.getElementById("loading").style.display = "block";

  try {
    // https://testudo-picks-backend.onrender.com/api/courses/${type}
    const response = await fetch(`https://testudo-picks-backend.onrender.com/api/courses/${type}`);
    const courses = await response.json();
    displayCourses(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    container.innerHTML = "<p>Error loading courses.</p>";
  }

  document.getElementById("loading").style.display = "none";
});


function displayCourses(courses) {
  const container = document.getElementById("course-results");
  container.innerHTML = "";

  courses.forEach(course => {
    const courseDiv = document.createElement("div");
    courseDiv.innerHTML = `
      <h3>
        <a href="https://app.testudo.umd.edu/soc/search?courseId=${course.id}&sectionId=&termId=202508&openSectionsOnly=true&_openSectionsOnly=on&creditCompare=%3E%3D&credits=0.0
        &courseLevelFilter=ALL&instructor=&_facetoface=on&_blended=on&_online=on&courseStartCompare=&courseStartHour=&courseStartMin=&courseStartAM=&courseEndHour=&courseEndMin=
        &courseEndAM=&teachingCenter=ALL&_classDay1=on&_classDay2=on&_classDay3=on&_classDay4=on&_classDay5=on" target="_blank">${course.id}</a>
      </h3>
      <p><strong>Average GPA:</strong> ${
        course.average_gpa != -1.0
          ? `<a href="https://planetterp.com/course/${course.id}" target="_blank">${course.average_gpa.toFixed(2)}</a>`
          : "N/A"
      }</p>      
      <p><strong>Restrictions:</strong> ${course.restrictions || "N/A"}</p>
      <h4>Sections:</h4>
      <div class="sections"></div>
    `;

    const sectionsContainer = courseDiv.querySelector(".sections");

    course.sections.forEach(section => {
      const sectionDiv = document.createElement("div");
      sectionDiv.classList.add("section-card");

      if (section.teacher == "Instructor: TBA") {
        sectionDiv.innerHTML = `
          <p><strong>Section:</strong> ${section.section_id}</p>
          <p><strong>Instructor:</strong></p>
          <p><strong>Seats:</strong> ${section.seat_info_span}</p>
        `;
      } else {
        sectionDiv.innerHTML = `
          <p><strong>Section:</strong> ${section.section_id}</p>
          <p><strong>Instructor:</strong> ${section.teacher}</p>
          <p><strong>Average Rating For Instructor:</strong> ${
          section.average_rating != null
          ? `<a href="https://planetterp.com/professor/${section.teacher.split(" ").slice(-1)[0]}" target="_blank">${section.average_rating.toFixed(2)}</a>`
          : "N/A"
          }</p>
          <p><strong>Seats:</strong> ${section.seat_info_span}</p>
        `;
      }

      section.section_times.forEach(time => {
        const timeP = document.createElement("p");
        if(time.time_on_elms_message) {
          timeP.innerHTML = `Class time/details on ELMS`;
        } else if(time.contact_department_message) {
          timeP.innerHTML = 'Contact department or instructor for details.';
        } else {
          timeP.innerHTML = `Days: ${time.days}, ${time.start_time} – ${time.end_time}`;
        }
        sectionDiv.appendChild(timeP);
      });

      sectionsContainer.appendChild(sectionDiv);
    });

    container.appendChild(courseDiv);
  });
}