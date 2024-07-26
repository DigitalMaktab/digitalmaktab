using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Dtos;
using digitalmaktabapi.Services;
using Microsoft.AspNetCore.Mvc;

namespace digitalmaktabapi.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class PdfController : ControllerBase
    {
        private readonly PdfService _pdfService;

        public PdfController(PdfService pdfService)
        {
            _pdfService = pdfService;
        }


        [HttpPost]
        [Route("generate")]
        public IActionResult GeneratePdf()
        {
            var htmlContent = @"<!DOCTYPE html>
<html lang='en'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Sample PDF</title>
    <link href='https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css' rel='stylesheet'>
    <style>
        body {
            margin: 20px;
        }
        header, footer {
            background-color: #f1f1f1;
            text-align: center;
            padding: 10px 0;
        }
        .content {
            margin: 20px 0;
            dir: 'rtl'
        }
    </style>
</head>
<body>

<header>
    <h1>Sample PDF Document</h1>
</header>

<div class='content'>
    <h2>Introduction</h2>
    <p>This is a sample PDF document generated using IronPDF in a .NET Core API. It demonstrates basic HTML and CSS styling for generating PDFs.</p>
    
    <h3>Styled Text</h3>
    <p>This paragraph contains <strong>bold text</strong>, <em>italic text</em>, and <u>underlined text</u>. You can also include <a href='https://google.com'>hyperlinks</a> and other HTML elements.</p>

    <h3>Sample Table</h3>
    <table class='table table-striped'>
        <thead>
            <tr>
                <th>#</th>
                <th>Name</th>
                <th>Age</th>
                <th>City</th>
                <th>Column 5</th>
                <th>Column 6</th>
                <th>Column 7</th>
                <th>Column 8</th>
                <th>Column 9</th>
                <th>Column 10</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>1</td>
                <td>John Doe</td>
                <td>28</td>
                <td>New York</td>
                <td>Data 1</td>
                <td>Data 2</td>
                <td>Data 3</td>
                <td>Data 4</td>
                <td>Data 5</td>
                <td>Data 6</td>
            </tr>
            <tr>
                <td>2</td>
                <td>Jane Smith</td>
                <td>34</td>
                <td>Los Angeles</td>
                <td>Data 1</td>
                <td>Data 2</td>
                <td>Data 3</td>
                <td>Data 4</td>
                <td>Data 5</td>
                <td>Data 6</td>
            </tr>
            <tr>
                <td>3</td>
                <td>Sam Wilson</td>
                <td>23</td>
                <td>Chicago</td>
                <td>Data 1</td>
                <td>Data 2</td>
                <td>Data 3</td>
                <td>Data 4</td>
                <td>Data 5</td>
                <td>Data 6</td>
            </tr>
            <tr>
                <td>4</td>
                <td>Person 4</td>
                <td>30</td>
                <td>City 4</td>
                <td>Data 1</td>
                <td>Data 2</td>
                <td>Data 3</td>
                <td>Data 4</td>
                <td>Data 5</td>
                <td>Data 6</td>
            </tr>
            <tr>
                <td>5</td>
                <td>Person 5</td>
                <td>31</td>
                <td>City 5</td>
                <td>Data 1</td>
                <td>Data 2</td>
                <td>Data 3</td>
                <td>Data 4</td>
                <td>Data 5</td>
                <td>Data 6</td>
            </tr>
            <tr>
                <td>6</td>
                <td>Person 6</td>
                <td>32</td>
                <td>City 6</td>
                <td>Data 1</td>
                <td>Data 2</td>
                <td>Data 3</td>
                <td>Data 4</td>
                <td>Data 5</td>
                <td>Data 6</td>
            </tr>
            <tr>
                <td>7</td>
                <td>Person 7</td>
                <td>33</td>
                <td>City 7</td>
                <td>Data 1</td>
                <td>Data 2</td>
                <td>Data 3</td>
                <td>Data 4</td>
                <td>Data 5</td>
                <td>Data 6</td>
            </tr>
            <tr>
                <td>8</td>
                <td>Person 8</td>
                <td>34</td>
                <td>City 8</td>
                <td>Data 1</td>
                <td>Data 2</td>
                <td>Data 3</td>
                <td>Data 4</td>
                <td>Data 5</td>
                <td>Data 6</td>
            </tr>
            <tr>
                <td>9</td>
                <td>Person 9</td>
                <td>35</td>
                <td>City 9</td>
                <td>Data 1</td>
                <td>Data 2</td>
                <td>Data 3</td>
                <td>Data 4</td>
                <td>Data 5</td>
                <td>Data 6</td>
            </tr>
            <tr>
                <td>10</td>
                <td>Person 10</td>
                <td>36</td>
                <td>City 10</td>
                <td>Data 1</td>
                <td>Data 2</td>
                <td>Data 3</td>
                <td>Data 4</td>
                <td>Data 5</td>
                <td>Data 6</td>
            </tr>
        </tbody>
    </table>

    <h3>Sample Image</h3>
    <img src='https://upload.wikimedia.org/wikipedia/commons/6/63/Emblem_of_the_Ministry_of_Education_of_Afghanistan.svg'
     class='img img-fluid' height='100' width='100' alt='Sample Image'>
</div>

<footer>
    <p>Generated by IronPDF in a .NET Core API</p>
</footer>

<script src='https://code.jquery.com/jquery-3.5.1.slim.min.js'></script>
<script src='https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js'></script>
<script src='https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js'></script>
</body>
</html>";
            var rtlHtmlContent = @"<!DOCTYPE html>
<html lang='en' dir='rtl'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Sample PDF</title>
    <link href='https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css' rel='stylesheet'>
    <style>
        body {
            margin: 20px;
            font-family: 'Arial', sans-serif;
        }
        header, footer {
            background-color: #4CAF50;
            color: white;
            text-align: center;
            padding: 15px 0;
        }
        .content {
            margin: 20px 0;
        }
        .content h2, .content h3 {
            color: #4CAF50;
        }
        .table {
            margin-top: 20px;
        }
        .table th {
            background-color: #f2f2f2;
            text-align: center;
        }
        .table td {
            text-align: center;
        }
        .highlight {
            background-color: #ffeb3b;
        }
        .img-container {
            text-align: center;
            margin: 20px 0;
        }
        .img-container img {
            max-width: 150px;
            border: 2px solid #4CAF50;
            border-radius: 10px;
        }
    </style>
</head>
<body>

<header>
    <h1>وثيقة PDF نموذجية</h1>
</header>

<div class='content'>
    <h2>مقدمة</h2>
    <p>هذه وثيقة PDF نموذجية تم إنشاؤها باستخدام IronPDF في API الخاص بـ .NET Core. وهي توضح تنسيق HTML وCSS الأساسي لإنشاء ملفات PDF.</p>
    
    <h3>نص منسق</h3>
    <p>يحتوي هذا الفقرة على <strong>نص غامق</strong>، <em>نص مائل</em>، و<u>نص مسطر</u>. يمكنك أيضًا تضمين <a href='#'>روابط</a> وعناصر HTML أخرى.</p>

    <h3>جدول عينة</h3>
    <table class='table table-bordered table - hover'>
        <thead class='thead-dark'>
            <tr>
                <th>#</th>
                <th>الاسم</th>
                <th>العمر</th>
                <th>المدينة</th>
                <th>العمود 5</th>
                <th>العمود 6</th>
                <th>العمود 7</th>
                <th>العمود 8</th>
                <th>العمود 9</th>
                <th>العمود 10</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>1</td>
                <td>جون دو</td>
                <td>28</td>
                <td>نيويورك</td>
                <td>البيانات 1</td>
                <td>البيانات 2</td>
                <td>البيانات 3</td>
                <td>البيانات 4</td>
                <td>البيانات 5</td>
                <td>البيانات 6</td>
            </tr>
            <tr class='highlight'>
                <td>2</td>
                <td>جين سميث</td>
                <td>34</td>
                <td>لوس أنجلوس</td>
                <td>البيانات 1</td>
                <td>البيانات 2</td>
                <td>البيانات 3</td>
                <td>البيانات 4</td>
                <td>البيانات 5</td>
                <td>البيانات 6</td>
            </tr>
            <tr>
                <td>3</td>
                <td>سام ويلسون</td>
                <td>23</td>
                <td>شيكاغو</td>
                <td>البيانات 1</td>
                <td>البيانات 2</td>
                <td>البيانات 3</td>
                <td>البيانات 4</td>
                <td>البيانات 5</td>
                <td>البيانات 6</td>
            </tr>
            <tr class='highlight'>
                <td>4</td>
                <td>الشخص 4</td>
                <td>30</td>
                <td>المدينة 4</td>
                <td>البيانات 1</td>
                <td>البيانات 2</td>
                <td>البيانات 3</td>
                <td>البيانات 4</td>
                <td>البيانات 5</td>
                <td>البيانات 6</td>
            </tr>
            <tr>
                <td>5</td>
                <td>الشخص 5</td>
                <td>31</td>
                <td>المدينة 5</td>
                <td>البيانات 1</td>
                <td>البيانات 2</td>
                <td>البيانات 3</td>
                <td>البيانات 4</td>
                <td>البيانات 5</td>
                <td>البيانات 6</td>
            </tr>
            <tr class='highlight'>
                <td>6</td>
                <td>الشخص 6</td>
                <td>32</td>
                <td>المدينة 6</td>
                <td>البيانات 1</td>
                <td>البيانات 2</td>
                <td>البيانات 3</td>
                <td>البيانات 4</td>
                <td>البيانات 5</td>
                <td>البيانات 6</td>
            </tr>
            <tr>
                <td>7</td>
                <td>الشخص 7</td>
                <td>33</td>
                <td>المدينة 7</td>
                <td>البيانات 1</td>
                <td>البيانات 2</td>
                <td>البيانات 3</td>
                <td>البيانات 4</td>
                <td>البيانات 5</td>
                <td>البيانات 6</td>
            </tr>
            <tr class='highlight'>
                <td>8</td>
                <td>الشخص 8</td>
                <td>34</td>
                <td>المدينة 8</td>
                <td>البيانات 1</td>
                <td>البيانات 2</td>
                <td>البيانات 3</td>
                <td>البيانات 4</td>
                <td>البيانات 5</td>
                <td>البيانات 6</td>
            </tr>
            <tr>
                <td>9</td>
                <td>الشخص 9</td>
                <td>35</td>
                <td>المدينة 9</td>
                <td>البيانات 1</td>
                <td>البيانات 2</td>
                <td>البيانات 3</td>
                <td>البيانات 4</td>
                <td>البيانات 5</td>
                <td>البيانات 6</td>
            </tr>
            <tr class='highlight'>
                <td>10</td>
                <td>الشخص 10</td>
                <td>36</td>
                <td>المدينة 10</td>
                <td>البيانات 1</td>
                <td>البيانات 2</td>
                <td>البيانات 3</td>
                <td>البيانات 4</td>
                <td>البيانات 5</td>
                <td>البيانات 6</td>
            </tr>
        </tbody>
    </table>

    <div class='img-container'>
        <h3>صورة عينة</h3>
        <img src = 'https://via.placeholder.com/150' class='img-fluid' alt='Sample Image'>
    </div>
</div>

<footer>
    <p>تم الإنشاء بواسطة IronPDF في.NET Core API</p>
</footer>

<script src = 'https://code.jquery.com/jquery-3.5.1.slim.min.js'></script>
<script src = 'https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js'></script>
<script src = 'https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js'></script>
</body>
</html>
";
            var pdf = _pdfService.GeneratePdf(rtlHtmlContent);
            return File(pdf, "application/pdf", "generated.pdf");
        }
    }
}